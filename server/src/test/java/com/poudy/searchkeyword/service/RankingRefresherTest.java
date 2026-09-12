package com.poudy.searchkeyword.service;

import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.poudy.searchkeyword.domain.KeywordBuckets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;

class RankingRefresherTest {

    @Test
    void refreshesThenSchedulesItselfAtTheNextBucketBoundary() {
        Clock clock = Clock.fixed(Instant.parse("2026-09-11T10:34:00Z"), ZoneOffset.UTC);
        SearchKeywordService service = mock(SearchKeywordService.class);
        ScheduledExecutorService scheduler = mock(ScheduledExecutorService.class);
        RankingRefresher refresher = new RankingRefresher(service, new KeywordBuckets(clock, 168), scheduler);

        refresher.run();

        var order = inOrder(service, scheduler);
        order.verify(service).refreshRankings();
        order.verify(scheduler).schedule(refresher, Duration.ofMinutes(6).toNanos(), TimeUnit.NANOSECONDS);
    }

    @Test
    void recomputesWithoutWaitingWhenTheBoundaryPassesDuringTheRefresh() {
        MutableClock clock = new MutableClock(Instant.parse("2026-09-11T10:09:59Z"));
        SearchKeywordService service = mock(SearchKeywordService.class);
        ScheduledExecutorService scheduler = mock(ScheduledExecutorService.class);
        doAnswer(invocation -> {
            clock.now = Instant.parse("2026-09-11T10:10:01Z");
            return null;
        }).when(service).refreshRankings();
        RankingRefresher refresher = new RankingRefresher(service, new KeywordBuckets(clock, 168), scheduler);

        refresher.run();

        verify(scheduler).schedule(refresher, 0L, TimeUnit.NANOSECONDS);
    }

    private static final class MutableClock extends Clock {
        private Instant now;

        private MutableClock(Instant now) {
            this.now = now;
        }

        @Override
        public Instant instant() {
            return now;
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }
    }
}
