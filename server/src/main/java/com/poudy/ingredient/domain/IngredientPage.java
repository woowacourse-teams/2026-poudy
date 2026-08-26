package com.poudy.ingredient.domain;

import java.util.List;

public record IngredientPage(List<Ingredient> items, long totalElements) {

    public IngredientPage {
        items = List.copyOf(items);
    }
}
