package com.poudy.search.domain;

import java.util.List;

public final class SearchableText {

    private static final String COMBINATION_MARK = "/";

    private final String text;
    private final IndexedText normalized;
    private final IndexedText chosung;
    private final IndexedText foldedChosung;
    private final boolean combined;
    private final boolean reading;

    private SearchableText(String text, IndexedText normalized, boolean reading) {
        this.text = text;
        this.normalized = normalized;
        this.chosung = normalized.withValue(Chosung.of(normalized.value()).value());
        this.foldedChosung = chosung.withValue(new Chosung(chosung.value()).folded().value());
        this.combined = normalized.value().contains(COMBINATION_MARK);
        this.reading = reading;
    }

    public static SearchableText of(String text) {
        return new SearchableText(text, IndexedText.normalize(text), false);
    }

    public static List<SearchableText> formsOf(String text) {
        IndexedText normalized = IndexedText.normalize(text);
        SearchableText original = new SearchableText(text, normalized, false);
        IndexedText read = LatinReading.ofName(normalized);

        if (read.value().equals(normalized.value())) {
            return List.of(original);
        }

        return List.of(original, new SearchableText(text, read, true));
    }

    public String text() {
        return text;
    }

    public String normalized() {
        return normalized.value();
    }

    public String chosung() {
        return chosung.value();
    }

    public String foldedChosung() {
        return foldedChosung.value();
    }

    public boolean combined() {
        return combined;
    }

    public boolean reading() {
        return reading;
    }

    MatchRange rangeOf(String searched) {
        IndexedText compared = comparedWith(searched);
        int startIndex = compared.value().indexOf(searched);
        if (startIndex < 0) {
            throw new IllegalArgumentException("일치하지 않는 검색 표현의 범위를 계산할 수 없습니다.");
        }
        return compared.rangeOf(startIndex, startIndex + searched.length());
    }

    private IndexedText comparedWith(String searched) {
        if (!Chosung.isWrittenIn(searched)) {
            return normalized;
        }
        if (searched.length() == 1 && !Chosung.isDouble(searched)) {
            return foldedChosung;
        }
        return chosung;
    }
}
