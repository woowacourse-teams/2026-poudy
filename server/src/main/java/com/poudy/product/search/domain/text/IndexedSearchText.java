package com.poudy.product.search.domain.text;

import com.poudy.product.search.domain.text.position.SourcePositions;
import java.util.ArrayList;
import java.util.List;

public final class IndexedSearchText {
    private final String text;
    private final SourcePositions positions;

    private IndexedSearchText(String text, SourcePositions positions) {
        if (text.length() != positions.size()) {
            throw new IllegalArgumentException("검색 표현과 원문 위치의 길이가 다릅니다.");
        }
        this.text = text;
        this.positions = positions;
    }

    public String text() {
        return text;
    }

    public int length() {
        return text.length();
    }

    public char charAt(int index) {
        return text.charAt(index);
    }

    public int startAt(int index) {
        return positions.startAt(index);
    }

    public int endAt(int index) {
        return positions.endAt(index);
    }

    public int[] sourceStarts() {
        return positions.starts();
    }

    public int[] sourceEnds() {
        return positions.ends();
    }

    public int[] sourceRange(int start, int end) {
        return positions.range(start, end);
    }

    public boolean hasHangul() {
        return text.chars().anyMatch(c -> c >= '가' && c <= '힣');
    }

    public static Builder builder() {
        return new Builder();
    }

    public static final class Builder {
        private final StringBuilder text = new StringBuilder();
        private final List<Integer> starts = new ArrayList<>();
        private final List<Integer> ends = new ArrayList<>();

        public void append(char letter, int start, int end) {
            text.append(letter);
            starts.add(start);
            ends.add(end);
        }

        public void append(String letters, int start, int end) {
            for (int i = 0; i < letters.length(); i++) {
                append(letters.charAt(i), start, end);
            }
        }

        public void append(IndexedSearchText source, int index) {
            append(source.charAt(index), source.startAt(index), source.endAt(index));
        }

        public IndexedSearchText build() {
            return new IndexedSearchText(
                text.toString(),
                new SourcePositions(
                    starts.stream().mapToInt(Integer::intValue).toArray(),
                    ends.stream().mapToInt(Integer::intValue).toArray()
                )
            );
        }
    }
}
