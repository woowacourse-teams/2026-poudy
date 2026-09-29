package com.poudy.ingredientgroup.domain;

import java.util.List;

public record IngredientBundle(IngredientGroup group, List<Long> ingredientIds) {

    public IngredientBundle {
        ingredientIds = List.copyOf(ingredientIds);
    }
}
