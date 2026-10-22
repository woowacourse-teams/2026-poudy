package com.poudy.ingredient.domain;

import com.poudy.excludecode.domain.ExcludeCodeSummary;
import com.poudy.search.domain.MatchRange;
import java.util.List;
import java.util.Objects;

public final class IngredientSuggestion {

    private final Ingredient ingredient;
    private final IngredientMatchField field;
    private final String text;
    private final MatchRange range;
    private final List<ExcludeCodeSummary> excludeGroups;

    public IngredientSuggestion(Ingredient ingredient, IngredientMatchField field, String text, MatchRange range) {
        this(ingredient, field, text, range, List.of());
    }

    public IngredientSuggestion(
        Ingredient ingredient,
        IngredientMatchField field,
        String text,
        MatchRange range,
        List<ExcludeCodeSummary> excludeGroups
    ) {
        Objects.requireNonNull(ingredient);
        Objects.requireNonNull(field);
        Objects.requireNonNull(text);
        Objects.requireNonNull(range);
        List<ExcludeCodeSummary> groups = List.copyOf(excludeGroups);
        if (!range.isWithin(text)) {
            throw new IllegalArgumentException("성분 검색 일치 구간이 원문 범위를 벗어났습니다.");
        }
        this.ingredient = ingredient;
        this.field = field;
        this.text = text;
        this.range = range;
        this.excludeGroups = groups;
    }

    public Long ingredientId() {
        return ingredient.id();
    }

    public Ingredient ingredient() {
        return ingredient;
    }

    public IngredientMatchField field() {
        return field;
    }

    public String text() {
        return text;
    }

    public MatchRange range() {
        return range;
    }

    public List<ExcludeCodeSummary> excludeGroups() {
        return excludeGroups;
    }

    public IngredientSuggestion withExcludeGroups(List<ExcludeCodeSummary> groups) {
        return new IngredientSuggestion(ingredient, field, text, range, groups);
    }
}
