package com.poudy.ingredient.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record IngredientSummaryResponse(
        @NotNull @Schema(example = "1010") Long id,
        @NotNull @Schema(example = "부틸렌글라이콜") String koreanName,
        @NotNull @Schema(example = "Butylene Glycol") String englishName) {
}
