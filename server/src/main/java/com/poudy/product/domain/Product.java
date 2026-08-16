package com.poudy.product.domain;

import com.poudy.ingredient.domain.Ingredients;
import java.util.List;
import java.util.Objects;

public record Product(Long id, Long brandId, Long categoryId, String productName, Ingredients ingredients) {

    public Product {
        ingredients = Objects.requireNonNullElseGet(ingredients, () -> new Ingredients(List.of()));
    }

    public boolean contains(Long ingredientId) {
        if (ingredientId == null) {
            return false;
        }

        return ingredients.findById(ingredientId).isPresent();
    }
}
