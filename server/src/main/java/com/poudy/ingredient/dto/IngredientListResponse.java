package com.poudy.ingredient.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;

public record IngredientListResponse(@NotNull List<IngredientResponse> items) {
}
