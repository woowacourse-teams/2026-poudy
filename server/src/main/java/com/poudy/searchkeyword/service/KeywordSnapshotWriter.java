package com.poudy.searchkeyword.service;

import com.poudy.searchkeyword.domain.KeywordBuckets;
import com.poudy.searchkeyword.repository.KeywordSnapshotRepository;
import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

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
            repository.save(buckets.snapshot());
            lastSuccessfulSaveAt = Instant.now();
        } catch (RuntimeException failure) {
            failures.incrementAndGet();
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
