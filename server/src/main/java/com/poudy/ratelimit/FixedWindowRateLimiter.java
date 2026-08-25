package com.poudy.ratelimit;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

public final class FixedWindowRateLimiter {

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
            int maxTrackedClients,
            Duration pruneInterval,
            Clock clock) {
        if (maxRequests <= 0) {
            throw new IllegalArgumentException("maxRequests must be positive");
        }
        if (window.isZero() || window.isNegative()) {
            throw new IllegalArgumentException("window must be positive");
        }
        if (maxTrackedClients <= 0) {
            throw new IllegalArgumentException("maxTrackedClients must be positive");
        }
        if (pruneInterval.isZero() || pruneInterval.isNegative()) {
            throw new IllegalArgumentException("pruneInterval must be positive");
        }
        this.maxRequests = maxRequests;
        this.window = window;
        this.maxTrackedClients = maxTrackedClients;
        this.pruneInterval = pruneInterval;
        this.clock = clock;
    }

    public Optional<Duration> acquire(String clientId) {
        Instant now = clock.instant();
        pruneExpiredWindows(now);

        AtomicReference<Duration> retryAfter = new AtomicReference<>();
        AtomicBoolean capacityExceeded = new AtomicBoolean();
        String key = clientId == null || clientId.isBlank() ? "unknown" : clientId;

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
            return Optional.of(window);
        }
        return Optional.ofNullable(retryAfter.get());
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
