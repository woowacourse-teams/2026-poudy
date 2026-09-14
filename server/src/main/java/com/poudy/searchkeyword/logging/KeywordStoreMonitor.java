package com.poudy.searchkeyword.logging;

import com.poudy.searchkeyword.domain.KeywordBucketStatistics;
import com.poudy.searchkeyword.domain.KeywordBuckets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class KeywordStoreMonitor {
    private static final Logger LOG = LoggerFactory.getLogger(KeywordStoreMonitor.class);
    private final KeywordBuckets buckets;
    private boolean regressed;

    public KeywordStoreMonitor(KeywordBuckets buckets) {
        this.buckets = buckets;
    }

    public synchronized void sample() {
        KeywordBucketStatistics statistics = buckets.statistics();
        warnWhenRegressionChanges(statistics);
        logState(statistics);
    }

    private void warnWhenRegressionChanges(KeywordBucketStatistics statistics) {
        if (statistics.clockRegressed() != regressed) {
            LOG.warn(
                "event=search_keyword_store_clock_regression clockRegressed={} observedThrough={}",
                statistics.clockRegressed(),
                statistics.observedThrough()
            );
        }
        regressed = statistics.clockRegressed();
    }

    private void logState(KeywordBucketStatistics statistics) {
        LOG.info(
            "event=search_keyword_store entries={} keys={} buckets={} clockRegressed={} observedThrough={}",
            statistics.entryCount(),
            statistics.uniqueKeyCount(),
            statistics.bucketCount(),
            statistics.clockRegressed(),
            statistics.observedThrough()
        );
    }
}
