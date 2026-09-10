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
