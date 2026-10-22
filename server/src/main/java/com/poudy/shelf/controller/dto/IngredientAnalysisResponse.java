package com.poudy.shelf.controller.dto;

import com.poudy.shelf.domain.IngredientAnalysis;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record IngredientAnalysisResponse(
    @NotNull @Schema(example = "2") Integer badProductCount,
    @NotNull List<IngredientAnalysisItemResponse> items) {

    public static IngredientAnalysisResponse from(IngredientAnalysis analysis) {
        return new IngredientAnalysisResponse(
            analysis.badProductCount(),
            analysis.items().stream().map(IngredientAnalysisItemResponse::from).toList()
        );
    }
}
