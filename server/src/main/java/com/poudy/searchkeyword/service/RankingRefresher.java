package com.poudy.searchkeyword.service;

import com.poudy.searchkeyword.domain.KeywordBuckets;
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
        scheduler.schedule(this, waitFor(computedFor), TimeUnit.NANOSECONDS);
    }

    private long waitFor(Instant computedFor) {
        return Math.max(buckets.untilBucketAfter(computedFor).toNanos(), 0L);
    }
}
