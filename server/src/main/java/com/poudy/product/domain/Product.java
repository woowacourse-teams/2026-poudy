package com.poudy.product.domain;

import java.util.List;

public record Product(Long id, Long brandId, Long categoryId, String productName, List<ProductIngredient> ingredients) {

    public Product {
        ingredients = ingredients == null ? List.of() : List.copyOf(ingredients);
    }

    public boolean contains(Long ingredientId) {
        return ingredients.stream().anyMatch(ingredient -> ingredient.ingredientId().equals(ingredientId));
    }
}
