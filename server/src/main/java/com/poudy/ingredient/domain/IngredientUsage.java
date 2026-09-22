package com.poudy.ingredient.domain;

import java.util.Set;

public interface IngredientUsage {

    long countProductsContaining(Long ingredientId);

    Set<Long> usedIngredientIds();
}
