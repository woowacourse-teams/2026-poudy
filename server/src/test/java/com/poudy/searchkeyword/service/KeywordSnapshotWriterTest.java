package com.poudy.searchkeyword.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import com.poudy.searchkeyword.domain.KeywordBuckets;
import com.poudy.searchkeyword.repository.KeywordSnapshotRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;

class KeywordSnapshotWriterTest {

    private final KeywordBuckets buckets = new KeywordBuckets(
        Clock.fixed(Instant.parse("2026-09-08T10:30:00Z"), ZoneOffset.UTC),
        168
    );
    private final KeywordSnapshotRepository repository = mock(KeywordSnapshotRepository.class);
    private final KeywordSnapshotWriter writer = new KeywordSnapshotWriter(buckets, repository);

    @Test
    void slowSaveDoesNotBlockCollectionAndConcurrentRunSkips() throws Exception {
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        doAnswer(invocation -> {
            entered.countDown();
            release.await(5, TimeUnit.SECONDS);
            return null;
        }).when(repository).save(any());
        buckets.record("토너");
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<?> slowSave = executor.submit(writer);
            assertThat(entered.await(5, TimeUnit.SECONDS)).isTrue();
            executor.submit(() -> {
                buckets.record("토너");
                writer.run();
            }).get(2, TimeUnit.SECONDS);
            release.countDown();
            slowSave.get(5, TimeUnit.SECONDS);
        } finally {
            release.countDown();
        }
        verify(repository, times(1)).save(any());
        assertThat(buckets.snapshot().buckets().getFirst().counts()).containsEntry("토너", 2L);
    }

    @Test
    void failedSaveIsCountedAndNextRunSavesAgain() {
        doThrow(new IllegalStateException("save failed")).doNothing().when(repository).save(any());
        buckets.record("토너");

        writer.run();
        assertThat(writer.failureCount()).isOne();
        assertThat(writer.lastSuccessfulSaveAt()).isEmpty();

        writer.run();
        assertThat(writer.lastSuccessfulSaveAt()).isPresent();
        verify(repository, times(2)).save(any());
    }

    @Test
    void savesEveryRunEvenWhenNothingChanged() {
        doNothing().when(repository).save(any());
        buckets.record("토너");

        writer.run();
        writer.run();

        verify(repository, times(2)).save(any());
        assertThat(writer.failureCount()).isZero();
    }
}
