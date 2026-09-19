package com.poudy.ingredient.service;

import java.util.Set;

public interface IngredientUsage {

    long countProductsContaining(Long ingredientId);

    Set<Long> usedIngredientIds();
}
