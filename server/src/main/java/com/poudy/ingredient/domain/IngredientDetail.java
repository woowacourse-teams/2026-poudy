package com.poudy.ingredient.domain;

import com.poudy.excludecode.domain.ExcludeCode;
import java.util.List;

public record IngredientDetail(
    Ingredient ingredient,
    List<ExcludeCode> groupCodes,
    long productCount,
    List<IngredientProduct> products) {

    public IngredientDetail {
        groupCodes = List.copyOf(groupCodes);
        products = List.copyOf(products);
    }
}
