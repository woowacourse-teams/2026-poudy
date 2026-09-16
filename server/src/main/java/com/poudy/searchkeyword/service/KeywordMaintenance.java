package com.poudy.searchkeyword.service;

import com.poudy.searchkeyword.logging.KeywordStoreMonitor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class KeywordMaintenance implements Runnable {

    private static final Logger log = LoggerFactory.getLogger(KeywordMaintenance.class);

    private final KeywordSnapshotWriter writer;
    private final KeywordStoreMonitor storeMonitor;

    public KeywordMaintenance(KeywordSnapshotWriter writer, KeywordStoreMonitor storeMonitor) {
        this.writer = writer;
        this.storeMonitor = storeMonitor;
    }

    @Override
    public void run() {
        try {
            writer.run();
            storeMonitor.sample();
        } catch (RuntimeException exception) {
            log.warn("event=search_keyword_maintenance_failed");
        }
    }
}
