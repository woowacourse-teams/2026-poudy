package com.poudy.ingredient.controller.dto;

import com.poudy.ingredient.domain.Ingredient;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record IngredientListResponse(@NotNull @Schema(description = "조회된 성분") List<IngredientResponse> items) {

    public static IngredientListResponse from(List<Ingredient> ingredients) {
        return new IngredientListResponse(
                ingredients.stream()
                        .map(IngredientResponse::from)
                        .toList());
    }
}
