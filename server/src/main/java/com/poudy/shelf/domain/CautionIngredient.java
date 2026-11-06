package com.poudy.shelf.domain;

import com.poudy.ingredient.domain.Ingredient;
import java.util.List;

public final class CautionIngredient {

    private final Ingredient ingredient;
    private final List<IngredientAnalysisReason> reasons;

    public CautionIngredient(Ingredient ingredient, List<IngredientAnalysisReason> reasons) {
        this.ingredient = ingredient;
        this.reasons = List.copyOf(reasons);
    }

    public Long id() {
        return ingredient.id();
    }

    public String koreanName() {
        return ingredient.koreanName();
    }

    public List<IngredientAnalysisReason> reasons() {
        return reasons;
    }
}
