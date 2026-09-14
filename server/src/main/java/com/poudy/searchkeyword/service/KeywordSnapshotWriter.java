package com.poudy.searchkeyword.service;

import com.poudy.searchkeyword.domain.KeywordBuckets;
import com.poudy.searchkeyword.repository.KeywordSnapshotRepository;
import java.util.concurrent.locks.ReentrantLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class KeywordSnapshotWriter implements Runnable {

    private static final Logger log = LoggerFactory.getLogger(KeywordSnapshotWriter.class);

    private final KeywordBuckets buckets;
    private final KeywordSnapshotRepository repository;
    private final ReentrantLock writer = new ReentrantLock();

    public KeywordSnapshotWriter(KeywordBuckets buckets, KeywordSnapshotRepository repository) {
        this.buckets = buckets;
        this.repository = repository;
    }

    @Override
    public void run() {
        if (!writer.tryLock()) {
            return;
        }
        saveHoldingLock();
    }

    public void saveBeforeShutdown() {
        writer.lock();
        saveHoldingLock();
    }

    private void saveHoldingLock() {
        try {
            repository.save(buckets.snapshot());
        } catch (RuntimeException failure) {
            log.warn(
                "Search keyword snapshot save failed; retrying on the next cycle ({})",
                failure.getClass().getSimpleName()
            );
        } finally {
            writer.unlock();
        }
    }

}
