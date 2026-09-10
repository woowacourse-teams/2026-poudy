package com.poudy.searchkeyword.domain;

import java.time.Instant;
import java.util.List;
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
