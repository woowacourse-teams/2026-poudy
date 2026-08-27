package com.poudy.common.ratelimit;

import com.poudy.exception.TooManyRequestsException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

public final class FixedWindowRateLimiter {

    private static final int DEFAULT_MAX_TRACKED_CLIENTS = 100_000;
    private static final Duration DEFAULT_PRUNE_INTERVAL = Duration.ofMinutes(1);
    private static final String UNKNOWN_CLIENT = "unknown";

    private final int maxRequests;
    private final Duration window;
    private final Clock clock;
    private final int maxTrackedClients;
    private final Duration pruneInterval;
    private final ConcurrentMap<String, Window> windows = new ConcurrentHashMap<>();
    private final AtomicLong nextPruneAtMillis = new AtomicLong(Long.MIN_VALUE);

    public FixedWindowRateLimiter(
            int maxRequests,
            Duration window,
            Clock clock) {
        this(maxRequests, window, DEFAULT_MAX_TRACKED_CLIENTS, DEFAULT_PRUNE_INTERVAL, clock);
    }

    FixedWindowRateLimiter(
            int maxRequests,
            Duration window,
            int maxTrackedClients,
            Duration pruneInterval,
            Clock clock) {
        if (maxRequests <= 0) {
            throw new IllegalArgumentException("요청 제한 횟수는 양수여야 합니다.");
        }
        if (window.isZero() || window.isNegative()) {
            throw new IllegalArgumentException("요청 제한 시간 창은 양수여야 합니다.");
        }
        if (maxTrackedClients <= 0) {
            throw new IllegalArgumentException("요청 제한 추적 대상 수는 양수여야 합니다.");
        }
        if (pruneInterval.isZero() || pruneInterval.isNegative()) {
            throw new IllegalArgumentException("요청 제한 정리 주기는 양수여야 합니다.");
        }
        this.maxRequests = maxRequests;
        this.window = window;
        this.maxTrackedClients = maxTrackedClients;
        this.pruneInterval = pruneInterval;
        this.clock = clock;
    }

    public void requireAllowed(String clientId) {
        Instant now = clock.instant();
        pruneExpiredWindows(now);

        AtomicReference<Duration> retryAfter = new AtomicReference<>();
        AtomicBoolean capacityExceeded = new AtomicBoolean();
        String key = keyOf(clientId);

        windows.compute(key, (ignored, current) -> {
            if (current == null && windows.size() >= maxTrackedClients) {
                capacityExceeded.set(true);
                return null;
            }
            if (current == null || !now.isBefore(current.startedAt().plus(window))) {
                return new Window(now, 1);
            }
            if (current.count() >= maxRequests) {
                retryAfter.set(Duration.between(now, current.startedAt().plus(window)));
                return current;
            }
            return new Window(current.startedAt(), current.count() + 1);
        });

        if (capacityExceeded.get()) {
            throw new TooManyRequestsException(window);
        }
        if (retryAfter.get() != null) {
            throw new TooManyRequestsException(retryAfter.get());
        }
    }

    private static String keyOf(String clientId) {
        if (clientId == null || clientId.isBlank()) {
            return UNKNOWN_CLIENT;
        }

        return clientId;
    }

    private void pruneExpiredWindows(Instant now) {
        long nowMillis = now.toEpochMilli();
        long scheduledMillis = nextPruneAtMillis.get();
        if (nowMillis < scheduledMillis) {
            return;
        }

        long nextMillis = now.plus(pruneInterval).toEpochMilli();
        if (nextPruneAtMillis.compareAndSet(scheduledMillis, nextMillis)) {
            windows.entrySet().removeIf(entry -> !now.isBefore(entry.getValue().startedAt().plus(window)));
        }
    }

    private record Window(Instant startedAt, int count) {
    }
}
