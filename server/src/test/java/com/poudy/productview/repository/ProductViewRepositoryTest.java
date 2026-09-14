package com.poudy.productview.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIOException;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.poudy.productview.domain.ProductViews;
import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class ProductViewRepositoryTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 9, 12);
    private final ProductViewFileRepository productViewFileRepository = mock(ProductViewFileRepository.class);

    @Test
    void restoresCountsAndSkipsUnchangedState() throws Exception {
        when(productViewFileRepository.load()).thenReturn(ProductViews.from(Map.of(TODAY, Map.of(1L, 3L))));
        ProductViewRepository productViewRepository = ProductViewRepository.restore(productViewFileRepository);
        clearInvocations(productViewFileRepository);

        assertThat(productViewRepository.sumViewCounts(TODAY, null)).containsEntry(1L, 3L);
        productViewRepository.saveChanges();
        verifyNoInteractions(productViewFileRepository);
    }

    @Test
    void retriesFailedSaveWithoutRequiringAnotherIncrease() throws Exception {
        ProductViewRepository productViewRepository = emptyRepository();
        productViewRepository.increaseViewCount(1L, TODAY);
        doThrow(new IOException("disk unavailable")).doNothing().when(productViewFileRepository).save(any());

        assertThatIOException().isThrownBy(productViewRepository::saveChanges);
        productViewRepository.saveChanges();
        productViewRepository.saveChanges();

        verify(productViewFileRepository, times(2)).save(any());
    }

    @Test
    void concurrentIncreasesAreNotLostAndQueryResultsStayDetached() throws Exception {
        ProductViewRepository productViewRepository = emptyRepository();
        productViewRepository.increaseViewCount(1L, TODAY);
        Map<Long, Long> before = productViewRepository.sumViewCounts(TODAY, null);
        try (ExecutorService executor = Executors.newFixedThreadPool(8)) {
            List<Future<?>> tasks = new ArrayList<>();
            for (int worker = 0; worker < 8; worker++) {
                tasks.add(executor.submit(() -> {
                    for (int count = 0; count < 1000; count++) {
                        productViewRepository.increaseViewCount(1L, TODAY);
                    }
                }));
            }
            for (Future<?> task : tasks) {
                task.get(5, TimeUnit.SECONDS);
            }
        }
        assertThat(productViewRepository.sumViewCounts(TODAY, null)).containsEntry(1L, 8001L);
        assertThat(before).containsEntry(1L, 1L);
    }

    @Test
    void increasesDuringWriteProceedAndRemainForNextSerializedSave() throws Exception {
        ProductViewRepository productViewRepository = emptyRepository();
        CountDownLatch writing = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        doAnswer(invocation -> {
            writing.countDown();
            assertThat(release.await(5, TimeUnit.SECONDS)).isTrue();
            return null;
        }).when(productViewFileRepository).save(any());
        productViewRepository.increaseViewCount(1L, TODAY);
        try (ExecutorService executor = Executors.newFixedThreadPool(3)) {
            Future<?> first = executor.submit(() -> {
                productViewRepository.saveChanges();
                return null;
            });
            try {
                assertThat(writing.await(5, TimeUnit.SECONDS)).isTrue();
                executor.submit(() -> productViewRepository.increaseViewCount(1L, TODAY)).get(5, TimeUnit.SECONDS);
                assertThat(productViewRepository.sumViewCounts(TODAY, null)).containsEntry(1L, 2L);
                Future<?> second = executor.submit(() -> {
                    productViewRepository.saveChanges();
                    return null;
                });
                release.countDown();
                first.get(5, TimeUnit.SECONDS);
                second.get(5, TimeUnit.SECONDS);
            } finally {
                release.countDown();
            }
        }
        productViewRepository.saveChanges();
        ArgumentCaptor<ProductViews> snapshots = ArgumentCaptor.forClass(ProductViews.class);
        verify(productViewFileRepository, times(2)).save(snapshots.capture());
        assertThat(snapshots.getAllValues().get(0).sumViewCounts(TODAY, null)).containsEntry(1L, 1L);
        assertThat(snapshots.getAllValues().get(1).sumViewCounts(TODAY, null)).containsEntry(1L, 2L);
    }

    private ProductViewRepository emptyRepository() throws IOException {
        when(productViewFileRepository.load()).thenReturn(ProductViews.from(Map.of()));
        return ProductViewRepository.restore(productViewFileRepository);
    }
}
