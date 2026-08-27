package com.poudy.search.domain;

public final class MatchRange {

    private final int startIndex;
    private final int endIndexExclusive;

    public MatchRange(int startIndex, int endIndexExclusive) {
        if (startIndex < 0 || startIndex >= endIndexExclusive) {
            throw new IllegalArgumentException("검색 일치 범위가 올바르지 않습니다.");
        }
        this.startIndex = startIndex;
        this.endIndexExclusive = endIndexExclusive;
    }

    public int startIndex() {
        return startIndex;
    }

    public int endIndexExclusive() {
        return endIndexExclusive;
    }
}
