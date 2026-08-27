package com.poudy.ingredient.domain;

import com.poudy.search.domain.TextMatch;

final class IngredientTextMatch {

    private final IngredientMatchField field;
    private final TextMatch textMatch;

    IngredientTextMatch(IngredientMatchField field, TextMatch textMatch) {
        if (field == null || textMatch == null) {
            throw new IllegalArgumentException("성분 이름 일치 결과의 값이 필요합니다.");
        }
        this.field = field;
        this.textMatch = textMatch;
    }

    IngredientMatchField field() {
        return field;
    }

    TextMatch textMatch() {
        return textMatch;
    }
}
