package com.poudy.ingredient.domain;

import com.poudy.search.domain.MatchRange;
import java.util.Objects;

public record IngredientSuggestion(Ingredient ingredient, IngredientMatchField field, String text, MatchRange range) {

    public IngredientSuggestion {
        Objects.requireNonNull(ingredient);
        Objects.requireNonNull(field);
        Objects.requireNonNull(text);
        Objects.requireNonNull(range);
        if (range.endIndexExclusive() > text.length()) {
            throw new IllegalArgumentException("성분 검색 일치 구간이 원문 범위를 벗어났습니다.");
        }
    }
}
