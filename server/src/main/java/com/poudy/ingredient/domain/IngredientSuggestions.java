package com.poudy.ingredient.domain;

import com.poudy.ingredientgroup.domain.IngredientGroupSuggestion;
import java.util.List;

public record IngredientSuggestions(List<IngredientSuggestion> ingredients, List<IngredientGroupSuggestion> groups) {

    public IngredientSuggestions {
        ingredients = List.copyOf(ingredients);
        groups = List.copyOf(groups);
    }
}
