package com.poudy.product.domain;

import java.util.List;
import java.util.Objects;

public record Product(Long id, Long brandId, Long categoryId, String productName, List<ProductIngredient> ingredients) {

    public Product {
        ingredients = List.copyOf(Objects.requireNonNullElse(ingredients, List.of()));
    }

    public boolean contains(Long ingredientId) {
        // spotless:off
        return ingredients.stream()
                .anyMatch(ingredient -> ingredient.ingredientId().equals(ingredientId));
        // spotless:on
    }
}
