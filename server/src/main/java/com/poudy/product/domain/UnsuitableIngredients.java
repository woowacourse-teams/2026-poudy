package com.poudy.product.domain;

import com.poudy.ingredient.domain.Ingredient;
import java.util.Collection;
import java.util.List;

public record UnsuitableIngredients(boolean myFilterEmpty, List<Ingredient> values) {

    public UnsuitableIngredients {
        values = List.copyOf(values);
    }

    public static UnsuitableIngredients of(ProductPart part, Collection<Long> myFilterIngredientIds) {
        if (part == null) {
            return new UnsuitableIngredients(myFilterIngredientIds.isEmpty(), List.of());
        }
        return new UnsuitableIngredients(
            myFilterIngredientIds.isEmpty(),
            part.ingredientsIn(myFilterIngredientIds)
        );
    }
}
