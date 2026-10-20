package com.poudy.product.domain;

import com.poudy.ingredient.domain.Ingredient;
import java.util.Collection;
import java.util.List;

public record UnsuitableIngredients(boolean skinFilterEmpty, List<Ingredient> values) {

    public UnsuitableIngredients {
        values = List.copyOf(values);
    }

    public static UnsuitableIngredients of(ProductPart part, Collection<Long> skinFilterIngredientIds) {
        if (part == null) {
            return new UnsuitableIngredients(skinFilterIngredientIds.isEmpty(), List.of());
        }
        return new UnsuitableIngredients(
            skinFilterIngredientIds.isEmpty(),
            part.ingredientsIn(skinFilterIngredientIds)
        );
    }
}
