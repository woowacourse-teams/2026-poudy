package com.poudy.searchkeyword.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.searchkeyword.domain.KeywordBucketSnapshot;
import com.poudy.searchkeyword.domain.KeywordBuckets;
import com.poudy.searchkeyword.repository.KeywordSnapshotRepository;
import java.io.IOException;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class KeywordSnapshotWriterTest {
    @TempDir
    Path directory;
    private final KeywordBuckets buckets = new KeywordBuckets(
        Clock.fixed(Instant.parse("2026-09-08T10:30:00Z"), ZoneOffset.UTC),
        168,
        100
    );

    @Test
    void delayedWriteDoesNotBlockCollectionAndConcurrentWriterSkipsWithoutLosingLaterCounts() throws Exception {
        var entered = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var first = new AtomicBoolean(true);
        var repository = new KeywordSnapshotRepository(
            directory.resolve("buckets.json"),
            168
        ) {
            @Override
            protected void forceFile(Path temporary) throws IOException {
                if (first.getAndSet(false)) {
                    entered.countDown();
                    try {
                        if (!release.await(5, TimeUnit.SECONDS)) {
                            throw new IOException("Timed out");
                        }
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        throw new IOException(e);
                    }
                }
                super.forceFile(temporary);
            }
        };
        var writer = new KeywordSnapshotWriter(buckets, repository);
        buckets.record("토너");
        try (var executor = Executors.newFixedThreadPool(2)) {
            var task = executor.submit(writer);
            assertThat(entered.await(5, TimeUnit.SECONDS)).isTrue();
            executor.submit(() -> {
                buckets.record("토너");
                writer.run();
            }).get(2, TimeUnit.SECONDS);
            release.countDown();
            task.get(5, TimeUnit.SECONDS);
        } finally {
            release.countDown();
        }
        assertThat(repository.load().orElseThrow().buckets().getFirst().counts()).containsEntry("토너", 1L);
        writer.run();
        assertThat(repository.load().orElseThrow().buckets().getFirst().counts()).containsEntry("토너", 2L);
    }

    @Test
    void directorySyncFailureIsCountedAndNextRunRewritesWholeSnapshot() {
        var fail = new AtomicBoolean(true);
        var repository = new KeywordSnapshotRepository(
            directory.resolve("buckets.json"),
            168
        ) {
            @Override
            protected void syncDirectory(Path path) throws IOException {
                if (fail.getAndSet(false)) {
                    throw new IOException("Injected directory failure");
                }
                super.syncDirectory(path);
            }
        };
        var writer = new KeywordSnapshotWriter(buckets, repository);
        buckets.record("토너");
        writer.run();
        assertThat(writer.failureCount()).isOne();
        assertThat(writer.lastSuccessfulSaveAt()).isEmpty();
        buckets.record("토너");
        writer.run();
        assertThat(repository.load().orElseThrow().buckets().getFirst().counts()).containsEntry("토너", 2L);
        assertThat(writer.lastSuccessfulSaveAt()).isPresent();
    }

    @Test
    void writesEveryRunEvenWhenNothingChanged() {
        var saves = new AtomicInteger();
        var repository = new KeywordSnapshotRepository(directory.resolve("buckets.json"), 168) {
            @Override
            public void save(KeywordBucketSnapshot snapshot) {
                saves.incrementAndGet();
                super.save(snapshot);
            }
        };
        var writer = new KeywordSnapshotWriter(buckets, repository);
        buckets.record("토너");
        writer.run();
        writer.run();
        assertThat(saves).hasValue(2);
        assertThat(writer.failureCount()).isZero();
    }
}
