package com.poudy.productrequest.service;

import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.exception.TooManyRequestsException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("제품 등록 요청 제한")
class ProductRequestRateLimiterTest {

    @Test
    @DisplayName("같은 주소가 시간 창의 제한을 넘으면 거절한다")
    void rejectsOverLimitForSameClient() {
        MutableClock clock = new MutableClock();
        ProductRequestRateLimiter limiter = new ProductRequestRateLimiter(2, Duration.ofMinutes(10), clock);

        limiter.requireAllowed("client-a");
        limiter.requireAllowed("client-a");

        assertThatThrownBy(() -> limiter.requireAllowed("client-a"))
                .isInstanceOf(TooManyRequestsException.class);
        assertThatNoException().isThrownBy(() -> limiter.requireAllowed("client-b"));
    }

    @Test
    @DisplayName("시간 창이 지나면 다시 요청할 수 있다")
    void resetsAfterWindow() {
        MutableClock clock = new MutableClock();
        ProductRequestRateLimiter limiter = new ProductRequestRateLimiter(1, Duration.ofMinutes(10), clock);
        limiter.requireAllowed("client-a");

        clock.advance(Duration.ofMinutes(10));

        assertThatNoException().isThrownBy(() -> limiter.requireAllowed("client-a"));
    }

    @Test
    @DisplayName("추적 대상 상한을 넘는 새 주소는 거절한다")
    void rejectsNewClientWhenTrackingCapacityIsFull() {
        MutableClock clock = new MutableClock();
        ProductRequestRateLimiter limiter = new ProductRequestRateLimiter(
                2,
                Duration.ofMinutes(10),
                2,
                Duration.ofMinutes(1),
                clock);
        limiter.requireAllowed("client-a");
        limiter.requireAllowed("client-b");

        assertThatThrownBy(() -> limiter.requireAllowed("client-c"))
                .isInstanceOf(TooManyRequestsException.class);
        assertThatNoException().isThrownBy(() -> limiter.requireAllowed("client-a"));
    }

    @Test
    @DisplayName("정리 주기가 지나면 만료된 주소를 제거해 새 주소를 추적한다")
    void prunesExpiredClientsPeriodically() {
        MutableClock clock = new MutableClock();
        ProductRequestRateLimiter limiter = new ProductRequestRateLimiter(
                1,
                Duration.ofMinutes(10),
                2,
                Duration.ofMinutes(1),
                clock);
        limiter.requireAllowed("client-a");
        limiter.requireAllowed("client-b");

        clock.advance(Duration.ofMinutes(10));

        assertThatNoException().isThrownBy(() -> limiter.requireAllowed("client-c"));
        assertThatNoException().isThrownBy(() -> limiter.requireAllowed("client-d"));
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
