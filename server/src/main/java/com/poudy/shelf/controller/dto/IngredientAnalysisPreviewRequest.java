package com.poudy.shelf.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record IngredientAnalysisPreviewRequest(
    @NotNull @Positive @Schema(example = "205") Long productId) {
}
