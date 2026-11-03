package com.poudy.product.controller.dto;

import com.poudy.ingredient.domain.Ingredient;
import jakarta.validation.constraints.NotNull;

public record ProductComparisonIngredientResponse(@NotNull Long id, @NotNull String koreanName) {

    public static ProductComparisonIngredientResponse from(Ingredient ingredient) {
        return new ProductComparisonIngredientResponse(ingredient.id(), ingredient.koreanName());
    }
}
