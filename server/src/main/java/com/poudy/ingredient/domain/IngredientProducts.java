package com.poudy.ingredient.domain;

import java.util.List;

public record IngredientProducts(long total, List<IngredientProduct> items) {
    public IngredientProducts {
        items = List.copyOf(items);
    }
}
