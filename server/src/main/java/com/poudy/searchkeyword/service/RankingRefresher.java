package com.poudy.searchkeyword.service;

import com.poudy.searchkeyword.domain.KeywordBuckets;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public final class RankingRefresher implements Runnable {

    private final SearchKeywordService service;
    private final KeywordBuckets buckets;
    private final ScheduledExecutorService scheduler;

    public RankingRefresher(SearchKeywordService service, KeywordBuckets buckets, ScheduledExecutorService scheduler) {
        this.service = service;
        this.buckets = buckets;
        this.scheduler = scheduler;
    }

    @Override
    public void run() {
        Instant computedFor = buckets.currentBucketStart();
        service.refreshRankings();
        scheduler.schedule(this, delayAfter(computedFor).toNanos(), TimeUnit.NANOSECONDS);
    }

    private Duration delayAfter(Instant computedFor) {
        if (!buckets.currentBucketStart().equals(computedFor)) {
            return Duration.ZERO;
        }
        return buckets.untilNextBucket();
    }
}
