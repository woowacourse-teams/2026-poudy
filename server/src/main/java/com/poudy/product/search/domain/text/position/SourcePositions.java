package com.poudy.product.search.domain.text.position;

import java.util.Arrays;

public final class SourcePositions {
    private final int[] starts;
    private final int[] ends;

    public SourcePositions(int[] starts, int[] ends) {
        if (starts.length != ends.length) {
            throw new IllegalArgumentException("검색 표현의 시작·끝 위치 수가 다릅니다.");
        }
        this.starts = starts.clone();
        this.ends = ends.clone();
    }

    public int size() {
        return starts.length;
    }

    public int startAt(int index) {
        return starts[index];
    }

    public int endAt(int index) {
        return ends[index];
    }

    public int[] starts() {
        return starts.clone();
    }

    public int[] ends() {
        return ends.clone();
    }

    public int[] range(int start, int end) {
        if (start < 0 || end <= start || end > starts.length) {
            throw new IllegalArgumentException("검색 범위가 표현을 벗어났습니다.");
        }
        return new int[] {
                Arrays.stream(starts, start, end).min().orElseThrow(),
                Arrays.stream(ends, start, end).max().orElseThrow()};
    }
}
