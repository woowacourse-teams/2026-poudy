package com.poudy.product.domain;

import com.poudy.brand.domain.Brand;
import com.poudy.category.domain.Category;
import com.poudy.ingredient.domain.Ingredients;
import java.util.List;
import java.util.Objects;

public record Product(Long id, Brand brand, Category category, String productName, Ingredients ingredients) {

    public Product {
        if (brand == null) {
            throw new IllegalArgumentException("제품은 브랜드를 가져야 합니다.");
        }
        if (category == null) {
            throw new IllegalArgumentException("제품은 카테고리를 가져야 합니다.");
        }
        ingredients = Objects.requireNonNullElseGet(ingredients, () -> new Ingredients(List.of()));
    }

    public boolean contains(Long ingredientId) {
        if (ingredientId == null) {
            return false;
        }

        return ingredients.findById(ingredientId).isPresent();
    }
}
