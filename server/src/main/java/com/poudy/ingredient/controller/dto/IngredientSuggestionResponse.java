package com.poudy.ingredient.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record IngredientSuggestionResponse(
        @NotNull @Schema(description = "자동완성 후보. 최대 10건") List<IngredientSummaryResponse> items) {
}
