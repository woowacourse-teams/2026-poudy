package com.poudy.searchkeyword.domain;

import com.poudy.search.domain.SearchKeyword;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

/** Time-bucketed input counts; all compound state transitions share this store's lock. */
public final class KeywordBuckets {

    private final Clock clock;
    private final int retainedHours;
    private final int bucketSeconds;
    private final int retainedBuckets;
    private final Instant startedAt;
    private final ReentrantLock lock = new ReentrantLock();
    private final TreeMap<Instant, ConcurrentHashMap<String, Long>> buckets = new TreeMap<>();
    private final Map<String, Long> totals = new HashMap<>();
    private int entryCount;
    private Instant maxObservedBucketStart;
    private boolean clockRegressed;

    public KeywordBuckets(Clock clock, int retainedHours) {
        this(
            clock,
            retainedHours,
            SearchKeywordPolicy.BUCKET_SECONDS
        );
    }

    public KeywordBuckets(
        Clock clock,
        int retainedHours,
        int bucketSeconds
    ) {
        if (retainedHours < 1) {
            throw new IllegalArgumentException("Retention must be positive");
        }
        if (bucketSeconds < 1 || 3600 % bucketSeconds != 0) {
            throw new IllegalArgumentException("Bucket duration must divide one hour");
        }
        this.bucketSeconds = bucketSeconds;
        this.retainedBuckets = Math.multiplyExact(retainedHours, 3600 / bucketSeconds);
        this.clock = clock;
        this.retainedHours = retainedHours;
        this.startedAt = clock.instant();
        this.maxObservedBucketStart = bucket(startedAt);
    }

    public RecordResult record(String normalizedQuery) {
        validateKey(normalizedQuery);
        lock.lock();
        try {
            Instant now = advance();
            if (clockRegressed) {
                return RecordResult.CLOCK_REGRESSION;
            }
            ConcurrentHashMap<String, Long> counts = buckets.get(maxObservedBucketStart);
            long oldCount = counts == null ? 0 : counts.getOrDefault(normalizedQuery, 0L);
            long nextCount = Math.incrementExact(oldCount);
            long nextTotal = Math.addExact(totals.getOrDefault(normalizedQuery, 0L), 1L);
            int nextEntryCount = oldCount == 0 ? Math.incrementExact(entryCount) : entryCount;
            if (counts == null) {
                counts = new ConcurrentHashMap<>();
                buckets.put(maxObservedBucketStart, counts);
            }
            if (oldCount == 0) {
                entryCount = nextEntryCount;
            }
            counts.put(normalizedQuery, nextCount);
            totals.put(normalizedQuery, nextTotal);
            return RecordResult.RECORDED;
        } finally {
            lock.unlock();
        }
    }

    public KeywordBucketView view() {
        lock.lock();
        try {
            Instant now = advance();
            int entries = entryCount;
            Instant observedThrough = now.isBefore(maxObservedBucketStart) ? maxObservedBucketStart : now;
            return new KeywordBucketView(
                totals,
                windowStart(),
                observedThrough,
                startedAt,
                clockRegressed,
                buckets.size(),
                entries,
                totals.size()
            );
        } finally {
            lock.unlock();
        }
    }

    public KeywordBucketStatistics statistics() {
        lock.lock();
        try {
            Instant now = advance();
            Instant observedThrough = now.isBefore(maxObservedBucketStart) ? maxObservedBucketStart : now;
            return new KeywordBucketStatistics(
                observedThrough,
                clockRegressed,
                buckets.size(),
                entryCount,
                totals.size()
            );
        } finally {
            lock.unlock();
        }
    }

    public void expire() {
        lock.lock();
        try {
            advance();
        } finally {
            lock.unlock();
        }
    }

    public KeywordBucketSnapshot snapshot() {
        lock.lock();
        try {
            Instant now = advance();
            Instant savedAt = now.isBefore(maxObservedBucketStart) ? maxObservedBucketStart : now;
            List<KeywordBucket> copies = buckets.entrySet().stream()
                .map(entry -> new KeywordBucket(entry.getKey(), entry.getValue())).toList();
            return new KeywordBucketSnapshot(savedAt, maxObservedBucketStart, copies);
        } finally {
            lock.unlock();
        }
    }

    /** Called once before collection starts. Validate the complete file before discarding expired entries. */
    public void restore(KeywordBucketSnapshot snapshot) {
        lock.lock();
        try {
            if (!buckets.isEmpty()) {
                throw new IllegalStateException("Restore requires an unused store");
            }
            validateSnapshot(snapshot);
            Map<String, Long> restoredTotals = new HashMap<>();
            int restoredEntries = 0;
            for (KeywordBucket bucket : snapshot.buckets()) {
                restoredEntries = Math.addExact(restoredEntries, bucket.counts().size());
                bucket.counts().forEach((key, count) -> restoredTotals.merge(key, count, Math::addExact));
            }
            buckets.clear();
            totals.clear();
            entryCount = 0;
            for (KeywordBucket bucket : snapshot.buckets()) {
                buckets.put(bucket.start(), new ConcurrentHashMap<>(bucket.counts()));
            }
            totals.putAll(restoredTotals);
            entryCount = restoredEntries;
            maxObservedBucketStart = snapshot.maxObservedBucketStart();
            advance();
        } finally {
            lock.unlock();
        }
    }

    private Instant advance() {
        Instant now = clock.instant();
        Instant observed = bucket(now);
        clockRegressed = observed.isBefore(maxObservedBucketStart);
        if (observed.isAfter(maxObservedBucketStart)) {
            maxObservedBucketStart = observed;
        }
        Instant lowerBound = windowStart();
        Iterator<Map.Entry<Instant, ConcurrentHashMap<String, Long>>> iterator = buckets.entrySet().iterator();
        while (iterator.hasNext()) {
            Map.Entry<Instant, ConcurrentHashMap<String, Long>> bucket = iterator.next();
            if (!bucket.getKey().isBefore(lowerBound)) {
                break;
            }
            bucket.getValue().forEach((key, count) -> totals.compute(key, (ignored, total) -> {
                long remaining = Math.subtractExact(total, count);
                return remaining == 0 ? null : remaining;
            }));
            entryCount = Math.subtractExact(entryCount, bucket.getValue().size());
            iterator.remove();
        }
        return now;
    }

    private Instant windowStart() {
        return maxObservedBucketStart.minus((retainedBuckets - 1L) * bucketSeconds, ChronoUnit.SECONDS);
    }

    private void validateSnapshot(KeywordBucketSnapshot snapshot) {
        if (!bucket(snapshot.maxObservedBucketStart()).equals(snapshot.maxObservedBucketStart())
            || snapshot.maxObservedBucketStart().isAfter(snapshot.savedAt())
            || snapshot.buckets().size() > retainedBuckets) {
            throw new IllegalArgumentException("Invalid snapshot metadata");
        }
        Map<Instant, Boolean> starts = new HashMap<>();
        for (KeywordBucket bucket : snapshot.buckets()) {
            if (!bucket(bucket.start()).equals(bucket.start())
                || bucket.start().isAfter(snapshot.maxObservedBucketStart())
                || bucket.start()
                    .isBefore(
                        snapshot.maxObservedBucketStart()
                            .minus((retainedBuckets - 1L) * bucketSeconds, ChronoUnit.SECONDS)
                    )
                || starts.put(bucket.start(), true) != null
                || bucket.counts().isEmpty()) {
                throw new IllegalArgumentException("Invalid snapshot bucket");
            }
            bucket.counts().forEach((key, count) -> {
                validateKey(key);
                if (count == null || count <= 0) {
                    throw new IllegalArgumentException("Invalid snapshot count");
                }
            });
        }
    }

    private static void validateKey(String key) {
        if (key == null || key.isEmpty() || key.length() > 300 || !new SearchKeyword(key).value().equals(key)) {
            throw new IllegalArgumentException("Invalid normalized keyword");
        }
    }

    private Instant bucket(Instant instant) {
        long epochSecond = instant.getEpochSecond();
        long startSecond = Math.floorDiv(epochSecond, bucketSeconds) * bucketSeconds;
        return Instant.ofEpochSecond(startSecond);
    }

    public enum RecordResult {
        RECORDED,
        CLOCK_REGRESSION
    }

}
