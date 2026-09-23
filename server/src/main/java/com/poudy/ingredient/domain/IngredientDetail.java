package com.poudy.ingredient.domain;

import java.util.List;

public record IngredientDetail(Ingredient ingredient, List<ExcludeCode> groupCodes, long productCount) {

    public IngredientDetail {
        groupCodes = List.copyOf(groupCodes);
    }
}
