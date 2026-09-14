package com.poudy.searchkeyword.domain;

import java.time.Instant;

public final class KeywordBucketStatistics {

    private final Instant observedThrough;
    private final boolean clockRegressed;
    private final int bucketCount;
    private final int entryCount;
    private final int uniqueKeyCount;

    public KeywordBucketStatistics(
        Instant observedThrough,
        boolean clockRegressed,
        int bucketCount,
        int entryCount,
        int uniqueKeyCount
    ) {
        this.observedThrough = observedThrough;
        this.clockRegressed = clockRegressed;
        this.bucketCount = bucketCount;
        this.entryCount = entryCount;
        this.uniqueKeyCount = uniqueKeyCount;
    }

    public Instant observedThrough() {
        return observedThrough;
    }

    public boolean clockRegressed() {
        return clockRegressed;
    }

    public int bucketCount() {
        return bucketCount;
    }

    public int entryCount() {
        return entryCount;
    }

    public int uniqueKeyCount() {
        return uniqueKeyCount;
    }
}
