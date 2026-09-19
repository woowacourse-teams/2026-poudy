package com.poudy.ingredient.service;

import com.poudy.ingredient.domain.ExcludeCode;
import com.poudy.ingredient.domain.Ingredient;
import java.util.List;

public record IngredientDetail(Ingredient ingredient, List<ExcludeCode> groupCodes, long productCount) {

    public IngredientDetail {
        groupCodes = List.copyOf(groupCodes);
    }
}
