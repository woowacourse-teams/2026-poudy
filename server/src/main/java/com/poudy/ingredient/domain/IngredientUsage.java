package com.poudy.ingredient.domain;

public interface IngredientUsage {

    IngredientProducts productsContaining(Long ingredientId, int size);
}
