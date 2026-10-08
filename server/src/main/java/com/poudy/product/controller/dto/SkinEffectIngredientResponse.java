package com.poudy.product.controller.dto;

import com.poudy.ingredient.domain.Ingredients;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record SkinEffectIngredientResponse(
    @NotNull @Schema(example = "7130") Long id,
    @NotNull @Schema(example = "세라마이드엔피") String koreanName) {

    public static List<SkinEffectIngredientResponse> from(List<Long> ingredientIds, Ingredients ingredients) {
        return ingredientIds.stream()
            .map(ingredientId -> ingredients.findById(ingredientId).orElseThrow())
            .map(ingredient -> new SkinEffectIngredientResponse(ingredient.id(), ingredient.koreanName()))
            .toList();
    }
}
