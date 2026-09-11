package com.poudy.searchkeyword.service;

import com.poudy.searchkeyword.domain.KeywordBuckets;
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
        service.refreshRankings();
        scheduler.schedule(this, buckets.untilNextBucket().toNanos(), TimeUnit.NANOSECONDS);
    }
}
