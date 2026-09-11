package com.poudy.searchkeyword.domain;

import java.time.Instant;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

public final class KeywordBucket {

    private final Instant start;
    private final Map<String, Long> counts;

    public KeywordBucket(Instant start, Map<String, Long> counts) {
        this.start = start;
        this.counts = Collections.unmodifiableMap(new HashMap<>(counts));
    }

    public Instant start() {
        return start;
    }

    public Map<String, Long> counts() {
        return counts;
    }

    public int entryCount() {
        return counts.size();
    }

    public void validateWithin(BucketWindow window, Instant latestStart) {
        if (!window.isStart(start) || !window.covers(latestStart, start) || counts.isEmpty()) {
            throw new IllegalArgumentException("Invalid snapshot bucket");
        }
        counts.forEach(KeywordBucket::requireValidCount);
    }

    private static void requireValidCount(String key, Long count) {
        KeywordKeys.requireNormalized(key);
        if (count == null || count <= 0) {
            throw new IllegalArgumentException("Invalid snapshot count");
        }
    }

    @Override
    public boolean equals(Object other) {
        return this == other || other instanceof KeywordBucket compared
            && Objects.equals(start, compared.start)
            && Objects.equals(counts, compared.counts);
    }

    @Override
    public int hashCode() {
        return Objects.hash(start, counts);
    }
}
