package com.poudy.ingredient.controller.dto;

import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.Ingredients;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record IngredientNameResponse(
    @NotNull @Schema(example = "7130") Long id,
    @NotNull @Schema(example = "세라마이드엔피") String koreanName) {

    public static IngredientNameResponse from(Ingredient ingredient) {
        return new IngredientNameResponse(ingredient.id(), ingredient.koreanName());
    }

    public static List<IngredientNameResponse> from(List<Long> ingredientIds, Ingredients ingredients) {
        return ingredientIds.stream()
            .map(ingredientId -> ingredients.findById(ingredientId).orElseThrow())
            .map(IngredientNameResponse::from)
            .toList();
    }
}
