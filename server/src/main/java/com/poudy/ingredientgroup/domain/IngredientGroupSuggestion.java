package com.poudy.ingredientgroup.domain;

import java.util.List;

public record IngredientGroupSuggestion(String code, String name, List<Long> ingredientIds) {

    public IngredientGroupSuggestion {
        ingredientIds = List.copyOf(ingredientIds);
    }
}
