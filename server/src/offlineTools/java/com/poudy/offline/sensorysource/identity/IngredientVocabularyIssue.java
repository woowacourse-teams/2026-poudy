package com.poudy.offline.sensorysource.identity;

import java.util.List;

public record IngredientVocabularyIssue(
        long canonicalIngredientId,
        Type type,
        List<String> rawValues) {

    public IngredientVocabularyIssue {
        if (canonicalIngredientId <= 0) {
            throw new IllegalArgumentException("canonicalIngredientId는 양수여야 합니다.");
        }
        if (type == null) {
            throw new IllegalArgumentException("vocabulary issue type이 필요합니다.");
        }

        rawValues = List.copyOf(rawValues);
        if (rawValues.isEmpty()
                || rawValues.stream().anyMatch(value -> IngredientIdentityResolver.normalize(value).isEmpty())) {
            throw new IllegalArgumentException("vocabulary issue에는 원문 값이 필요합니다.");
        }
    }

    public enum Type {
        SUSPECTED_LOCANT_COMMA_SPLIT_ALIAS_FRAGMENTS,
        UNSUPPORTED_ALIAS_SEPARATOR
    }
}
