package com.poudy.search.domain;

import java.text.BreakIterator;
import java.text.Normalizer;
import java.util.Arrays;
import java.util.Locale;

final class IndexedText {

    private final String value;
    private final int[] sourceStarts;
    private final int[] sourceEnds;

    private IndexedText(String value, int[] sourceStarts, int[] sourceEnds) {
        if (value.length() != sourceStarts.length || value.length() != sourceEnds.length) {
            throw new IllegalArgumentException("검색 표현과 원문 위치의 길이가 일치해야 합니다.");
        }
        this.value = value;
        this.sourceStarts = sourceStarts;
        this.sourceEnds = sourceEnds;
    }

    static IndexedText normalize(String source) {
        Builder normalized = builder();

        BreakIterator characters = BreakIterator.getCharacterInstance(Locale.ROOT);
        characters.setText(source);
        int start = characters.first();
        for (int end = characters.next(); end != BreakIterator.DONE; start = end, end = characters.next()) {
            String character = source.substring(start, end);
            String value = Normalizer.normalize(character, Normalizer.Form.NFC);
            value = Chosung.toCompatibilityLetters(value).toLowerCase(Locale.ROOT);
            appendWithoutSpaces(normalized, value, start, end);
        }

        return normalized.build();
    }

    static Builder builder() {
        return new Builder();
    }

    String value() {
        return value;
    }

    IndexedText withValue(String transformed) {
        if (transformed.length() != value.length()) {
            throw new IllegalArgumentException("길이가 같은 검색 표현만 위치를 그대로 사용할 수 있습니다.");
        }
        return new IndexedText(transformed, sourceStarts, sourceEnds);
    }

    MatchRange rangeOf(int startIndex, int endIndexExclusive) {
        if (startIndex < 0 || startIndex >= endIndexExclusive || endIndexExclusive > value.length()) {
            throw new IllegalArgumentException("일치 범위가 검색 표현을 벗어났습니다.");
        }
        return new MatchRange(sourceStarts[startIndex], sourceEnds[endIndexExclusive - 1]);
    }

    int sourceStartAt(int index) {
        return sourceStarts[index];
    }

    int sourceEndAt(int index) {
        return sourceEnds[index];
    }

    private static void appendWithoutSpaces(
        Builder target,
        String value,
        int sourceStart,
        int sourceEnd
    ) {
        for (int index = 0; index < value.length(); index++) {
            char character = value.charAt(index);
            if (SearchKeyword.isSpace(character)) {
                continue;
            }
            target.append(character, sourceStart, sourceEnd);
        }
    }

    static final class Builder {

        private static final int INITIAL_CAPACITY = 16;

        private final StringBuilder value = new StringBuilder();
        private int[] sourceStarts = new int[INITIAL_CAPACITY];
        private int[] sourceEnds = new int[INITIAL_CAPACITY];
        private int size;

        void append(char character, int sourceStart, int sourceEnd) {
            ensureCapacity();
            value.append(character);
            sourceStarts[size] = sourceStart;
            sourceEnds[size] = sourceEnd;
            size++;
        }

        void append(String text, int sourceStart, int sourceEnd) {
            for (int index = 0; index < text.length(); index++) {
                append(text.charAt(index), sourceStart, sourceEnd);
            }
        }

        void append(IndexedText source, int startIndex, int endIndexExclusive) {
            for (int index = startIndex; index < endIndexExclusive; index++) {
                append(source.value.charAt(index), source.sourceStartAt(index), source.sourceEndAt(index));
            }
        }

        IndexedText build() {
            return new IndexedText(
                value.toString(),
                Arrays.copyOf(sourceStarts, size),
                Arrays.copyOf(sourceEnds, size)
            );
        }

        private void ensureCapacity() {
            if (size < sourceStarts.length) {
                return;
            }
            int newLength = sourceStarts.length * 2;
            sourceStarts = Arrays.copyOf(sourceStarts, newLength);
            sourceEnds = Arrays.copyOf(sourceEnds, newLength);
        }
    }
}
