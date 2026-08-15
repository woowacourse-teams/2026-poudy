package com.poudy.common.domain;

public record SearchableText(String normalized, String chosung, String foldedChosung) {

    public static SearchableText of(String text) {
        String normalized = SearchKeyword.normalize(text);
        Chosung chosung = Chosung.of(normalized);

        return new SearchableText(normalized, chosung.value(), chosung.folded().value());
    }
}
