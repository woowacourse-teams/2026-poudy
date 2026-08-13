package com.poudy.ingredient.dto;

import jakarta.validation.constraints.NotNull;

public record IngredientSummaryResponse(@NotNull Long id, @NotNull String koreanName, @NotNull String englishName) {
}
