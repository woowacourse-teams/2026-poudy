package com.poudy.searchkeyword.domain;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

public final class KeywordBuckets {

    private final Clock clock;
    private final BucketWindow window;
    private final Instant startedAt;
    private final ReentrantLock lock = new ReentrantLock();
    private final TreeMap<Instant, Map<String, Long>> buckets = new TreeMap<>();
    private final Map<String, Long> totals = new HashMap<>();
    private int entryCount;
    private Instant maxObservedBucketStart;
    private boolean clockRegressed;

    public KeywordBuckets(Clock clock, BucketWindow window) {
        this.clock = clock;
        this.window = window;
        this.startedAt = clock.instant();
        this.maxObservedBucketStart = window.startOf(startedAt);
    }

    public RecordResult record(String normalizedQuery) {
        KeywordKeys.requireNormalized(normalizedQuery);
        lock.lock();
        try {
            advance();
            if (clockRegressed) {
                return RecordResult.CLOCK_REGRESSION;
            }
            increment(normalizedQuery);
            return RecordResult.RECORDED;
        } finally {
            lock.unlock();
        }
    }

    public KeywordBucketView view() {
        lock.lock();
        try {
            advance();
            return new KeywordBucketView(
                completedCounts(),
                window.oldestStart(maxObservedBucketStart),
                maxObservedBucketStart,
                startedAt,
                clockRegressed
            );
        } finally {
            lock.unlock();
        }
    }

    public KeywordBucketStatistics statistics() {
        lock.lock();
        try {
            Instant now = advance();
            return new KeywordBucketStatistics(
                observedThrough(now),
                clockRegressed,
                buckets.size(),
                entryCount,
                totals.size()
            );
        } finally {
            lock.unlock();
        }
    }

    public KeywordBucketSnapshot snapshot() {
        lock.lock();
        try {
            Instant now = advance();
            List<KeywordBucket> copies = buckets.entrySet().stream()
                .map(entry -> new KeywordBucket(entry.getKey(), entry.getValue()))
                .toList();
            return new KeywordBucketSnapshot(
                observedThrough(now),
                window.bucketSeconds(),
                maxObservedBucketStart,
                copies
            );
        } finally {
            lock.unlock();
        }
    }

    public void restore(KeywordBucketSnapshot snapshot) {
        lock.lock();
        try {
            if (!buckets.isEmpty()) {
                throw new IllegalStateException("Restore requires an unused store");
            }
            snapshot.validateWithin(window);
            load(snapshot);
            advance();
        } finally {
            lock.unlock();
        }
    }

    public Instant currentBucketStart() {
        return window.startOf(clock.instant());
    }

    public Optional<KeywordBucketView> comparisonView() {
        lock.lock();
        try {
            advance();
            return comparedWindow();
        } finally {
            lock.unlock();
        }
    }

    public Duration untilBucketAfter(Instant bucketStart) {
        return Duration.between(clock.instant(), window.nextStart(bucketStart));
    }

    private void load(KeywordBucketSnapshot snapshot) {
        Map<String, Long> restoredTotals = snapshot.totals();
        int restoredEntries = snapshot.entryCount();
        snapshot.countsByStart().forEach((start, counts) -> buckets.put(start, new ConcurrentHashMap<>(counts)));
        totals.putAll(restoredTotals);
        entryCount = restoredEntries;
        maxObservedBucketStart = snapshot.maxObservedBucketStart();
    }

    private Instant advance() {
        Instant now = clock.instant();
        Instant observed = window.startOf(now);
        clockRegressed = observed.isBefore(maxObservedBucketStart);
        if (observed.isAfter(maxObservedBucketStart)) {
            maxObservedBucketStart = observed;
        }
        removeExpired();
        return now;
    }

    private void removeExpired() {
        Instant oldest = window.retainedStart(maxObservedBucketStart);
        while (!buckets.isEmpty() && buckets.firstKey().isBefore(oldest)) {
            Map<String, Long> expired = buckets.pollFirstEntry().getValue();
            subtractFrom(totals, expired);
            entryCount = Math.subtractExact(entryCount, expired.size());
        }
    }

    private void increment(String key) {
        long total = Math.addExact(totals.getOrDefault(key, 0L), 1L);
        Map<String, Long> current = buckets.computeIfAbsent(
            maxObservedBucketStart,
            ignored -> new ConcurrentHashMap<>()
        );
        if (current.merge(key, 1L, Long::sum) == 1L) {
            entryCount = Math.incrementExact(entryCount);
        }
        totals.put(key, total);
    }

    private Optional<KeywordBucketView> comparedWindow() {
        if (!window.comparesWithPast()) {
            return Optional.empty();
        }
        Instant latest = window.comparisonLatestStart(maxObservedBucketStart);
        Instant oldest = window.oldestStart(latest);
        if (observedFrom().isAfter(oldest)) {
            return Optional.empty();
        }
        return Optional.of(new KeywordBucketView(sumOf(oldest, latest), oldest, latest, startedAt, clockRegressed));
    }

    private Instant observedFrom() {
        Instant started = window.startOf(startedAt);
        if (buckets.isEmpty() || started.isBefore(buckets.firstKey())) {
            return started;
        }
        return buckets.firstKey();
    }

    private static void addTo(Map<String, Long> target, Map<String, Long> counts) {
        counts.forEach((key, count) -> target.merge(key, count, Math::addExact));
    }

    private Map<String, Long> completedCounts() {
        return sumOf(window.oldestStart(maxObservedBucketStart), maxObservedBucketStart);
    }

    private Map<String, Long> sumOf(Instant from, Instant toExclusive) {
        Map<String, Long> counts = new HashMap<>();
        buckets.subMap(from, true, toExclusive, false).values().forEach(bucket -> addTo(counts, bucket));
        return counts;
    }

    private Instant observedThrough(Instant now) {
        if (now.isBefore(maxObservedBucketStart)) {
            return maxObservedBucketStart;
        }
        return now;
    }

    private static void subtractFrom(Map<String, Long> target, Map<String, Long> counts) {
        counts.forEach((key, count) -> target.computeIfPresent(key, (ignored, total) -> remainder(total, count)));
    }

    private static Long remainder(long total, long count) {
        long remaining = Math.subtractExact(total, count);
        if (remaining == 0) {
            return null;
        }
        return remaining;
    }

    public enum RecordResult {
        RECORDED,
        CLOCK_REGRESSION
    }
}
