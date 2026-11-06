package com.poudy.shelf.controller.dto;

import com.poudy.shelf.domain.IngredientAnalysisReason;
import jakarta.validation.constraints.NotNull;

public record IngredientAnalysisReasonResponse(
    @NotNull IngredientAnalysisReason code,
    @NotNull String name) {

    public static IngredientAnalysisReasonResponse from(IngredientAnalysisReason reason) {
        return new IngredientAnalysisReasonResponse(reason, reason.displayName());
    }
}
