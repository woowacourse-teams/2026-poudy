package com.poudy.searchkeyword.domain;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

public final class KeywordBucketSnapshot {

    private final Instant savedAt;
    private final Instant maxObservedBucketStart;
    private final List<KeywordBucket> buckets;

    public KeywordBucketSnapshot(Instant savedAt, Instant maxObservedBucketStart, List<KeywordBucket> buckets) {
        this.savedAt = savedAt;
        this.maxObservedBucketStart = maxObservedBucketStart;
        this.buckets = List.copyOf(buckets);
    }

    public Instant savedAt() {
        return savedAt;
    }

    public Instant maxObservedBucketStart() {
        return maxObservedBucketStart;
    }

    public List<KeywordBucket> buckets() {
        return buckets;
    }

    public void validateWithin(BucketWindow window) {
        if (!window.isStart(maxObservedBucketStart)
            || maxObservedBucketStart.isAfter(savedAt)
            || !window.canRetain(buckets.size())) {
            throw new IllegalArgumentException("Invalid snapshot metadata");
        }
        if (hasDuplicateStarts()) {
            throw new IllegalArgumentException("Invalid snapshot bucket");
        }
        buckets.forEach(bucket -> bucket.validateWithin(window, maxObservedBucketStart));
    }

    public Map<String, Long> totals() {
        Map<String, Long> totals = new HashMap<>();
        buckets.forEach(bucket -> bucket.counts().forEach((key, count) -> totals.merge(key, count, Math::addExact)));
        return totals;
    }

    public int entryCount() {
        return buckets.stream().mapToInt(KeywordBucket::entryCount).reduce(0, Math::addExact);
    }

    private boolean hasDuplicateStarts() {
        return buckets.stream().map(KeywordBucket::start).distinct().count() != buckets.size();
    }

    @Override
    public boolean equals(Object other) {
        return this == other || other instanceof KeywordBucketSnapshot compared
            && Objects.equals(savedAt, compared.savedAt)
            && Objects.equals(maxObservedBucketStart, compared.maxObservedBucketStart)
            && Objects.equals(buckets, compared.buckets);
    }

    @Override
    public int hashCode() {
        return Objects.hash(savedAt, maxObservedBucketStart, buckets);
    }
}
