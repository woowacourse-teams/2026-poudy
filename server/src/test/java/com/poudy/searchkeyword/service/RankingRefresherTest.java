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
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;

class RankingRefresherTest {

    private final SearchKeywordService service = mock(SearchKeywordService.class);
    private final ScheduledExecutorService scheduler = mock(ScheduledExecutorService.class);

    @Test
    void refreshesThenSchedulesItselfAtTheNextBucketBoundary() {
        Clock clock = Clock.fixed(Instant.parse("2026-09-11T10:34:00Z"), ZoneOffset.UTC);
        RankingRefresher refresher = new RankingRefresher(service, new KeywordBuckets(clock, 168), scheduler);

        refresher.run();

        var order = inOrder(service, scheduler);
        order.verify(service).refreshRankings();
        order.verify(scheduler).schedule(refresher, Duration.ofMinutes(6).toNanos(), TimeUnit.NANOSECONDS);
    }

    @Test
    void recomputesWithoutWaitingWhenTheBoundaryPassesDuringTheRefresh() {
        MutableClock clock = new MutableClock(Instant.parse("2026-09-11T10:09:59Z"));
        doAnswer(invocation -> {
            clock.now = Instant.parse("2026-09-11T10:10:01Z");
            return null;
        }).when(service).refreshRankings();
        RankingRefresher refresher = new RankingRefresher(service, new KeywordBuckets(clock, 168), scheduler);

        refresher.run();

        verify(scheduler).schedule(refresher, 0L, TimeUnit.NANOSECONDS);
    }

    @Test
    void waitsOnlyUntilTheBoundaryOfTheBucketItComputed() {
        SteppingClock clock = new SteppingClock(
            Instant.parse("2026-09-11T10:09:59.997Z"),
            Instant.parse("2026-09-11T10:09:59.998Z"),
            Instant.parse("2026-09-11T10:09:59.999Z"),
            Instant.parse("2026-09-11T10:10:00.001Z")
        );
        RankingRefresher refresher = new RankingRefresher(service, new KeywordBuckets(clock, 168), scheduler);

        refresher.run();

        verify(scheduler).schedule(refresher, Duration.ofMillis(1).toNanos(), TimeUnit.NANOSECONDS);
    }

    private static class MutableClock extends Clock {
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

    private static final class SteppingClock extends MutableClock {
        private final Deque<Instant> remaining;

        private SteppingClock(Instant... readings) {
            super(readings[0]);
            this.remaining = new ArrayDeque<>(List.of(readings));
        }

        @Override
        public Instant instant() {
            if (remaining.size() > 1) {
                return remaining.poll();
            }
            return remaining.peek();
        }
    }
}
