package com.poudy.search.domain;

import java.util.List;

public record SearchableText(
    String normalized,
    String chosung,
    String foldedChosung,
    boolean combined,
    boolean reading) {

    private static final String COMBINATION_MARK = "/";

    public static SearchableText of(String text) {
        return ofNormalized(SearchKeyword.normalize(text), false);
    }

    public static List<SearchableText> formsOf(String text) {
        String normalized = SearchKeyword.normalize(text);
        SearchableText original = ofNormalized(normalized, false);
        String read = LatinReading.ofName(normalized);

        if (read.equals(normalized)) {
            return List.of(original);
        }

        return List.of(original, ofNormalized(read, true));
    }

    private static SearchableText ofNormalized(String normalized, boolean reading) {
        Chosung chosung = Chosung.of(normalized);

        return new SearchableText(
            normalized,
            chosung.value(),
            chosung.folded().value(),
            normalized.contains(COMBINATION_MARK),
            reading
        );
    }
}
