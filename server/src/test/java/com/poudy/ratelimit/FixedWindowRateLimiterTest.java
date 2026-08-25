package com.poudy.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.IntStream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("고정 시간 창 요청 제한")
class FixedWindowRateLimiterTest {

    @Test
    @DisplayName("제한을 넘으면 시간 창의 남은 시간을 반환한다")
    void returnsRemainingWindowWhenLimitIsExceeded() {
        MutableClock clock = new MutableClock();
        FixedWindowRateLimiter limiter = limiter(2, Duration.ofMinutes(10), 100, clock);
        assertThat(limiter.acquire("client-a")).isEmpty();
        assertThat(limiter.acquire("client-a")).isEmpty();

        clock.advance(Duration.ofMinutes(2));

        assertThat(limiter.acquire("client-a")).contains(Duration.ofMinutes(8));
        assertThat(limiter.acquire("client-b")).isEmpty();
    }

    @Test
    @DisplayName("시간 창 경계에 도달하면 새 창에서 요청을 허용한다")
    void resetsAtWindowBoundary() {
        MutableClock clock = new MutableClock();
        FixedWindowRateLimiter limiter = limiter(1, Duration.ofMinutes(10), 100, clock);
        assertThat(limiter.acquire("client-a")).isEmpty();

        clock.advance(Duration.ofMinutes(10));

        assertThat(limiter.acquire("client-a")).isEmpty();
    }

    @Test
    @DisplayName("추적 대상 상한을 넘는 새 주소에는 전체 시간 창을 반환한다")
    void rejectsNewClientWhenTrackingCapacityIsFull() {
        MutableClock clock = new MutableClock();
        FixedWindowRateLimiter limiter = limiter(2, Duration.ofMinutes(10), 2, clock);
        assertThat(limiter.acquire("client-a")).isEmpty();
        assertThat(limiter.acquire("client-b")).isEmpty();

        assertThat(limiter.acquire("client-c")).contains(Duration.ofMinutes(10));
        assertThat(limiter.acquire("client-a")).isEmpty();
    }

    @Test
    @DisplayName("정리 주기가 지나면 만료된 주소를 제거한다")
    void prunesExpiredClientsPeriodically() {
        MutableClock clock = new MutableClock();
        FixedWindowRateLimiter limiter = limiter(1, Duration.ofMinutes(10), 2, clock);
        assertThat(limiter.acquire("client-a")).isEmpty();
        assertThat(limiter.acquire("client-b")).isEmpty();

        clock.advance(Duration.ofMinutes(10));

        assertThat(limiter.acquire("client-c")).isEmpty();
        assertThat(limiter.acquire("client-d")).isEmpty();
    }

    @Test
    @DisplayName("주소가 없거나 공백이면 같은 unknown 주소로 제한한다")
    void groupsMissingClientIdsAsUnknown() {
        MutableClock clock = new MutableClock();
        FixedWindowRateLimiter limiter = limiter(1, Duration.ofMinutes(10), 100, clock);

        assertThat(limiter.acquire(null)).isEmpty();

        assertThat(limiter.acquire("  ")).contains(Duration.ofMinutes(10));
    }

    @Test
    @DisplayName("인스턴스마다 요청 제한 상태를 따로 관리한다")
    void keepsStatePerInstance() {
        MutableClock clock = new MutableClock();
        FixedWindowRateLimiter first = limiter(1, Duration.ofMinutes(10), 100, clock);
        FixedWindowRateLimiter second = limiter(1, Duration.ofMinutes(10), 100, clock);
        assertThat(first.acquire("client-a")).isEmpty();

        assertThat(first.acquire("client-a")).contains(Duration.ofMinutes(10));
        assertThat(second.acquire("client-a")).isEmpty();
    }

    @Test
    @DisplayName("같은 주소의 동시 요청도 최대 횟수까지만 허용한다")
    void limitsConcurrentRequestsForSameClient() throws Exception {
        MutableClock clock = new MutableClock();
        FixedWindowRateLimiter limiter = limiter(10, Duration.ofMinutes(10), 100, clock);
        List<Callable<Boolean>> requests = IntStream.range(0, 100)
                .mapToObj(ignored -> (Callable<Boolean>) () -> limiter.acquire("client-a").isEmpty())
                .toList();

        long allowed;
        try (ExecutorService executor = Executors.newFixedThreadPool(16)) {
            List<Future<Boolean>> results = executor.invokeAll(requests);
            allowed = results.stream().filter(FixedWindowRateLimiterTest::allowed).count();
        }

        assertThat(allowed).isEqualTo(10);
    }

    private static boolean allowed(Future<Boolean> result) {
        try {
            return result.get();
        } catch (Exception exception) {
            throw new AssertionError(exception);
        }
    }

    private static FixedWindowRateLimiter limiter(
            int maxRequests,
            Duration window,
            int maxTrackedClients,
            Clock clock) {
        return new FixedWindowRateLimiter(
                maxRequests,
                window,
                maxTrackedClients,
                Duration.ofMinutes(1),
                clock);
    }

    private static final class MutableClock extends Clock {

        private Instant instant = Instant.parse("2026-08-23T00:00:00Z");

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return instant;
        }

        void advance(Duration duration) {
            instant = instant.plus(duration);
        }
    }
}
