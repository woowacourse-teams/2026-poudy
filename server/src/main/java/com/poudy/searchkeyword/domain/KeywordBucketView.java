package com.poudy.searchkeyword.domain;

import java.time.Instant;
import java.util.Map;

public final class KeywordBucketView {

    private final Map<String, Long> counts;
    private final Instant windowStart;
    private final Instant observedThrough;
    private final Instant startedAt;
    private final boolean clockRegressed;
    private final int bucketCount;
    private final int entryCount;
    private final int uniqueKeyCount;

    public KeywordBucketView(
        Map<String, Long> counts,
        Instant windowStart,
        Instant observedThrough,
        Instant startedAt,
        boolean clockRegressed,
        int bucketCount,
        int entryCount,
        int uniqueKeyCount
    ) {
        this.counts = Map.copyOf(counts);
        this.windowStart = windowStart;
        this.observedThrough = observedThrough;
        this.startedAt = startedAt;
        this.clockRegressed = clockRegressed;
        this.bucketCount = bucketCount;
        this.entryCount = entryCount;
        this.uniqueKeyCount = uniqueKeyCount;
    }

    public Map<String, Long> counts() {
        return counts;
    }

    public Instant windowStart() {
        return windowStart;
    }

    public Instant observedThrough() {
        return observedThrough;
    }

    public Instant startedAt() {
        return startedAt;
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
