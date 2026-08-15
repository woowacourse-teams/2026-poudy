package com.poudy.ingredient.controller.dto;

import com.poudy.excludecode.domain.ExcludeCodeIngredient;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record IngredientSummaryResponse(
        @NotNull @Schema(example = "1010") Long id,
        @NotNull @Schema(example = "부틸렌글라이콜") String koreanName,
        @NotNull @Schema(example = "Butylene Glycol") String englishName) {

    public static IngredientSummaryResponse from(ExcludeCodeIngredient ingredient) {
        return new IngredientSummaryResponse(ingredient.id(), ingredient.koreanName(), ingredient.englishName());
    }

    public static List<IngredientSummaryResponse> from(List<ExcludeCodeIngredient> ingredients) {
        // spotless:off
        return ingredients.stream()
                .map(IngredientSummaryResponse::from)
                .toList();
        // spotless:on
    }
}
