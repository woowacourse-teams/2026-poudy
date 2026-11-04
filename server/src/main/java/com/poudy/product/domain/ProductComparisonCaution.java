package com.poudy.product.domain;

import com.poudy.excludecode.domain.ExcludeCode;
import com.poudy.ingredient.domain.Ingredient;
import java.util.List;

public record ProductComparisonCaution(ExcludeCode code, String name, List<Ingredient> ingredients) {

    public ProductComparisonCaution {
        ingredients = List.copyOf(ingredients);
    }

    public boolean contains() {
        return !ingredients.isEmpty();
    }
}
