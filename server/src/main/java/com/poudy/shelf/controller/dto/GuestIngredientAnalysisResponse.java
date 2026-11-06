package com.poudy.shelf.controller.dto;

import com.poudy.shelf.domain.GuestIngredientAnalysis;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record GuestIngredientAnalysisResponse(
    @NotNull @Schema(example = "2") Integer badProductCount,
    @NotNull List<IngredientAnalysisItemResponse> items,
    @NotNull @ArraySchema(schema = @Schema(example = "15")) List<Long> possiblyUnsuitableProductIds) {

    public static GuestIngredientAnalysisResponse from(GuestIngredientAnalysis guestAnalysis) {
        IngredientAnalysisResponse analysis = IngredientAnalysisResponse.from(guestAnalysis.analysis());
        return new GuestIngredientAnalysisResponse(
            analysis.badProductCount(),
            analysis.items(),
            guestAnalysis.possiblyUnsuitableProductIds()
        );
    }
}
