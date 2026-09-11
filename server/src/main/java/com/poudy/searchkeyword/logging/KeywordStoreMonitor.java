package com.poudy.searchkeyword.logging;

import com.poudy.searchkeyword.domain.KeywordBucketStatistics;
import com.poudy.searchkeyword.domain.KeywordBuckets;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import java.util.concurrent.atomic.AtomicLong;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class KeywordStoreMonitor {
    private static final Logger LOG = LoggerFactory.getLogger(KeywordStoreMonitor.class);
    private final KeywordBuckets buckets;
    private final String store;
    private boolean regressed;
    private final AtomicLong entries = new AtomicLong();
    private final AtomicLong keys = new AtomicLong();

    public KeywordStoreMonitor(KeywordBuckets buckets, String store, MeterRegistry registry) {
        this.buckets = buckets;
        this.store = store;
        Gauge.builder("poudy.search.entries", entries, AtomicLong::doubleValue).tag("store", store).register(registry);
        Gauge.builder("poudy.search.keys", keys, AtomicLong::doubleValue).tag("store", store).register(registry);
    }

    public synchronized void sample() {
        KeywordBucketStatistics statistics = buckets.statistics();
        entries.set(statistics.entryCount());
        keys.set(statistics.uniqueKeyCount());
        warnWhenRegressionChanges(statistics);
        logState(statistics);
    }

    private void warnWhenRegressionChanges(KeywordBucketStatistics statistics) {
        if (statistics.clockRegressed() != regressed) {
            LOG.warn(
                "event=search_keyword_store_clock_regression store={} clockRegressed={} observedThrough={}",
                store,
                statistics.clockRegressed(),
                statistics.observedThrough()
            );
        }
        regressed = statistics.clockRegressed();
    }

    private void logState(KeywordBucketStatistics statistics) {
        LOG.info(
            "event=search_keyword_store store={} entries={} keys={} buckets={} clockRegressed={} observedThrough={}",
            store,
            statistics.entryCount(),
            statistics.uniqueKeyCount(),
            statistics.bucketCount(),
            statistics.clockRegressed(),
            statistics.observedThrough()
        );
    }
}
