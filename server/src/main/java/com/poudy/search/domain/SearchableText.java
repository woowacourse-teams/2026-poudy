package com.poudy.search.domain;

public record SearchableText(String normalized, String chosung, String foldedChosung, boolean combined) {

    private static final String COMBINATION_MARK = "/";

    public static SearchableText of(String text) {
        String normalized = SearchKeyword.normalize(text);
        Chosung chosung = Chosung.of(normalized);

        return new SearchableText(
                normalized,
                chosung.value(),
                chosung.folded().value(),
                normalized.contains(COMBINATION_MARK));
    }
}
