package com.poudy.ingredient.service;

import java.util.List;
import java.util.Objects;

public record IngredientQuery(List<Long> ingredientIds) {

    public IngredientQuery {
        ingredientIds = List.copyOf(Objects.requireNonNullElse(ingredientIds, List.of()));
    }

    public boolean hasIngredientIds() {
        return !ingredientIds.isEmpty();
    }
}
