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

    public boolean isWithin(String text) {
        return endIndexExclusive <= text.length();
    }

    public boolean connectsWith(MatchRange next) {
        return next.startIndex <= endIndexExclusive;
    }

    public MatchRange union(MatchRange other) {
        return new MatchRange(
            Math.min(startIndex, other.startIndex),
            Math.max(endIndexExclusive, other.endIndexExclusive)
        );
    }

    public int startIndex() {
        return startIndex;
    }

    public int endIndexExclusive() {
        return endIndexExclusive;
    }
}
