package com.poudy.searchkeyword.service;

import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;

import com.poudy.searchkeyword.domain.KeywordBuckets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

class RankingRefresherTest {

    @Test
    void refreshesThenSchedulesItselfAtTheNextBucketBoundary() {
        Clock clock = Clock.fixed(Instant.parse("2026-09-11T10:34:00Z"), ZoneOffset.UTC);
        SearchKeywordService service = mock(SearchKeywordService.class);
        ScheduledExecutorService scheduler = mock(ScheduledExecutorService.class);
        RankingRefresher refresher = new RankingRefresher(service, new KeywordBuckets(clock, 168), scheduler);

        refresher.run();

        InOrder order = inOrder(service, scheduler);
        order.verify(service).refreshRankings();
        order.verify(scheduler).schedule(refresher, Duration.ofMinutes(6).toNanos(), TimeUnit.NANOSECONDS);
    }
}
