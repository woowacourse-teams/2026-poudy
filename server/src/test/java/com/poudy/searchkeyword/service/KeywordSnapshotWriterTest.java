package com.poudy.searchkeyword.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import com.poudy.searchkeyword.domain.BucketWindow;
import com.poudy.searchkeyword.domain.KeywordBucketSnapshot;
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
import java.util.concurrent.TimeoutException;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class KeywordSnapshotWriterTest {

    private final KeywordBuckets buckets = new KeywordBuckets(
        Clock.fixed(Instant.parse("2026-09-08T10:30:00Z"), ZoneOffset.UTC),
        new BucketWindow(168, 600, 0)
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
    void shutdownSaveWaitsForTheRunningSaveAndThenSavesTheLatestCounts() throws Exception {
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        doAnswer(invocation -> {
            entered.countDown();
            release.await(5, TimeUnit.SECONDS);
            return null;
        }).doNothing().when(repository).save(any());
        buckets.record("토너");
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<?> periodic = executor.submit(writer);
            assertThat(entered.await(5, TimeUnit.SECONDS)).isTrue();
            buckets.record("토너");
            Future<?> shutdown = executor.submit(writer::saveBeforeShutdown);
            assertThatThrownBy(() -> shutdown.get(200, TimeUnit.MILLISECONDS)).isInstanceOf(TimeoutException.class);
            release.countDown();
            periodic.get(5, TimeUnit.SECONDS);
            shutdown.get(5, TimeUnit.SECONDS);
        } finally {
            release.countDown();
        }
        ArgumentCaptor<KeywordBucketSnapshot> saved = ArgumentCaptor.forClass(KeywordBucketSnapshot.class);
        verify(repository, times(2)).save(saved.capture());
        assertThat(saved.getAllValues().getLast().buckets().getFirst().counts()).containsEntry("토너", 2L);
    }

    @Test
    void failedSaveIsRetriedOnTheNextRun() {
        doThrow(new IllegalStateException("save failed")).doNothing().when(repository).save(any());
        buckets.record("토너");

        writer.run();

        writer.run();
        verify(repository, times(2)).save(any());
    }

    @Test
    void savesEveryRunEvenWhenNothingChanged() {
        doNothing().when(repository).save(any());
        buckets.record("토너");

        writer.run();
        writer.run();

        verify(repository, times(2)).save(any());
    }
}
