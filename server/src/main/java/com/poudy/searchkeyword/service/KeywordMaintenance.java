package com.poudy.searchkeyword.service;

import com.poudy.searchkeyword.logging.KeywordResourceMonitor;
import com.poudy.searchkeyword.logging.KeywordStoreMonitor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class KeywordMaintenance implements Runnable {

    private static final Logger log = LoggerFactory.getLogger(KeywordMaintenance.class);

    private final KeywordSnapshotWriter writer;
    private final KeywordStoreMonitor storeMonitor;
    private final KeywordResourceMonitor resourceMonitor;
    private final Runnable reportExport;

    public KeywordMaintenance(
        KeywordSnapshotWriter writer,
        KeywordStoreMonitor storeMonitor,
        KeywordResourceMonitor resourceMonitor,
        Runnable reportExport
    ) {
        this.writer = writer;
        this.storeMonitor = storeMonitor;
        this.resourceMonitor = resourceMonitor;
        this.reportExport = reportExport;
    }

    @Override
    public void run() {
        try {
            writer.run();
            storeMonitor.sample();
            resourceMonitor.sample();
            reportExport.run();
        } catch (RuntimeException exception) {
            log.warn("event=search_keyword_maintenance_failed");
        }
    }
}
