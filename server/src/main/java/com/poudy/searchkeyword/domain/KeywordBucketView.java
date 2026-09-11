package com.poudy.searchkeyword.domain;

import java.time.Instant;
import java.util.Map;

public final class KeywordBucketView {

    private final Map<String, Long> counts;
    private final Instant windowStart;
    private final Instant observedThrough;
    private final Instant startedAt;
    private final boolean clockRegressed;

    public KeywordBucketView(
        Map<String, Long> counts,
        Instant windowStart,
        Instant observedThrough,
        Instant startedAt,
        boolean clockRegressed
    ) {
        this.counts = Map.copyOf(counts);
        this.windowStart = windowStart;
        this.observedThrough = observedThrough;
        this.startedAt = startedAt;
        this.clockRegressed = clockRegressed;
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
}
