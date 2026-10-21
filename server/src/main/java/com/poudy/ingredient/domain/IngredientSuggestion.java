package com.poudy.ingredient.domain;

import com.poudy.excludecode.domain.ExcludeCodeSummary;
import com.poudy.search.domain.MatchRange;
import java.util.List;
import java.util.Objects;

public record IngredientSuggestion(
    Ingredient ingredient,
    IngredientMatchField field,
    String text,
    MatchRange range,
    List<ExcludeCodeSummary> excludeGroups) {

    public IngredientSuggestion(Ingredient ingredient, IngredientMatchField field, String text, MatchRange range) {
        this(ingredient, field, text, range, List.of());
    }

    public IngredientSuggestion {
        Objects.requireNonNull(ingredient);
        Objects.requireNonNull(field);
        Objects.requireNonNull(text);
        Objects.requireNonNull(range);
        excludeGroups = List.copyOf(excludeGroups);
        if (range.endIndexExclusive() > text.length()) {
            throw new IllegalArgumentException("성분 검색 일치 구간이 원문 범위를 벗어났습니다.");
        }
    }

    public IngredientSuggestion withExcludeGroups(List<ExcludeCodeSummary> groups) {
        return new IngredientSuggestion(ingredient, field, text, range, groups);
    }
}
