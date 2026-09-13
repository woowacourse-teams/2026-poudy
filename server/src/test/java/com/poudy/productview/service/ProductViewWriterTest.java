package com.poudy.productview.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import com.poudy.productview.domain.ProductViewSnapshot;
import com.poudy.productview.domain.ProductViews;
import com.poudy.productview.repository.ProductViewFileRepository;
import java.io.IOException;
import java.time.Clock;
import java.time.LocalDate;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class ProductViewWriterTest {

    private final ProductViews views = new ProductViews(Clock.systemUTC(), new ProductViewSnapshot(0, Map.of()));
    private final ProductViewFileRepository repository = mock(ProductViewFileRepository.class);
    private final ProductViewWriter writer = new ProductViewWriter(views, repository);

    @Test
    void skipsUnchangedStateAndRetriesFailedSave() throws Exception {
        writer.save();
        verifyNoInteractions(repository);
        views.increaseViewCount(1L);
        doThrow(new IOException("disk unavailable")).doNothing().when(repository).save(any());
        writer.save();
        writer.save();
        writer.save();
        verify(repository, times(2)).save(any());
    }

    @Test
    void increasesDuringWriteProceedAndRemainForNextSerializedSave() throws Exception {
        CountDownLatch writing = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        doAnswer(invocation -> {
            writing.countDown();
            assertThat(release.await(5, TimeUnit.SECONDS)).isTrue();
            return null;
        }).when(repository).save(any());
        views.increaseViewCount(1L);
        try (var executor = Executors.newFixedThreadPool(3)) {
            var first = executor.submit(writer::save);
            try {
                assertThat(writing.await(5, TimeUnit.SECONDS)).isTrue();
                executor.submit(() -> views.increaseViewCount(1L)).get(5, TimeUnit.SECONDS);
                assertThat(views.totals(null)).containsEntry(1L, 2L);
                var second = executor.submit(writer::save);
                release.countDown();
                first.get(5, TimeUnit.SECONDS);
                second.get(5, TimeUnit.SECONDS);
            } finally {
                release.countDown();
            }
        }
        writer.save();
        ArgumentCaptor<ProductViewSnapshot> snapshots = ArgumentCaptor.forClass(ProductViewSnapshot.class);
        verify(repository, times(2)).save(snapshots.capture());
        assertThat(snapshots.getAllValues().get(0).totals(LocalDate.now(), null)).containsEntry(1L, 1L);
        assertThat(snapshots.getAllValues().get(1).totals(LocalDate.now(), null)).containsEntry(1L, 2L);
    }
}
