package com.poudy.searchkeyword.domain;

import java.time.Instant;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

public final class KeywordBucketSnapshot {

    private final Instant savedAt;
    private final int bucketSeconds;
    private final Instant maxObservedBucketStart;
    private final List<KeywordBucket> buckets;

    public KeywordBucketSnapshot(
        Instant savedAt,
        int bucketSeconds,
        Instant maxObservedBucketStart,
        List<KeywordBucket> buckets
    ) {
        this.savedAt = savedAt;
        this.bucketSeconds = bucketSeconds;
        this.maxObservedBucketStart = maxObservedBucketStart;
        this.buckets = List.copyOf(buckets);
    }

    public Instant savedAt() {
        return savedAt;
    }

    public int bucketSeconds() {
        return bucketSeconds;
    }

    public Instant maxObservedBucketStart() {
        return maxObservedBucketStart;
    }

    public List<KeywordBucket> buckets() {
        return buckets;
    }

    public void validateWithin(BucketWindow window) {
        if (!window.hasBucketSeconds(bucketSeconds)) {
            throw new IllegalArgumentException("Snapshot bucket duration does not match");
        }
        if (!window.isStart(maxObservedBucketStart)
            || maxObservedBucketStart.isAfter(savedAt)
            || !window.canRetain(buckets.size())) {
            throw new IllegalArgumentException("Invalid snapshot metadata");
        }
        if (hasDuplicateStarts()) {
            throw new IllegalArgumentException("Invalid snapshot bucket");
        }
        buckets.forEach(bucket -> bucket.validateWithin(window, maxObservedBucketStart));
        requireSummableCounts();
    }

    public Map<Instant, Map<String, Long>> countsByStart() {
        Map<Instant, Map<String, Long>> byStart = new LinkedHashMap<>();
        buckets.forEach(bucket -> byStart.put(bucket.start(), bucket.counts()));
        return byStart;
    }

    private void requireSummableCounts() {
        Map<String, Long> sums = new HashMap<>();
        buckets.forEach(bucket -> bucket.addCountsTo(sums));
    }

    private boolean hasDuplicateStarts() {
        return buckets.stream().map(KeywordBucket::start).distinct().count() != buckets.size();
    }

    @Override
    public boolean equals(Object other) {
        return this == other || other instanceof KeywordBucketSnapshot compared
            && Objects.equals(savedAt, compared.savedAt)
            && bucketSeconds == compared.bucketSeconds
            && Objects.equals(maxObservedBucketStart, compared.maxObservedBucketStart)
            && Objects.equals(buckets, compared.buckets);
    }

    @Override
    public int hashCode() {
        return Objects.hash(savedAt, bucketSeconds, maxObservedBucketStart, buckets);
    }
}
