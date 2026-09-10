package com.poudy.searchkeyword.service;

import com.poudy.searchkeyword.domain.KeywordBuckets;
import com.poudy.searchkeyword.repository.KeywordSnapshotRepository;
import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Fixed-delay callers share one writer; concurrent invocations never enqueue additional work. */
public final class KeywordSnapshotWriter implements Runnable {

    private static final Logger log = LoggerFactory.getLogger(KeywordSnapshotWriter.class);

    private final KeywordBuckets buckets;
    private final KeywordSnapshotRepository repository;
    private final ReentrantLock writer = new ReentrantLock();
    private final AtomicLong failures = new AtomicLong();
    private volatile Instant lastSuccessfulSaveAt;

    public KeywordSnapshotWriter(KeywordBuckets buckets, KeywordSnapshotRepository repository) {
        this.buckets = buckets;
        this.repository = repository;
    }

    @Override
    public void run() {
        if (!writer.tryLock()) {
            return;
        }
        try {
            // 바뀐 게 없어도 매번 통째로 쓴다. 1분 칸 항목 20만 개에서도 14ms 안팎이다.
            repository.save(buckets.snapshot());
            lastSuccessfulSaveAt = Instant.now();
        } catch (RuntimeException failure) {
            failures.incrementAndGet();
            // Exception messages from serialization may contain keys. Never log search data here.
            log.warn(
                "Search keyword snapshot save failed; retrying on the next cycle ({})",
                failure.getClass().getSimpleName()
            );
        } finally {
            writer.unlock();
        }
    }

    public Optional<Instant> lastSuccessfulSaveAt() {
        return Optional.ofNullable(lastSuccessfulSaveAt);
    }

    public long failureCount() {
        return failures.get();
    }
}
