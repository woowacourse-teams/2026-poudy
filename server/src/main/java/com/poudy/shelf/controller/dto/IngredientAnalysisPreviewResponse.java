package com.poudy.shelf.controller.dto;

import com.poudy.shelf.domain.ShelfRatingPreview;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record IngredientAnalysisPreviewResponse(
    @NotNull IngredientAnalysisResponse withoutRating,
    @NotNull IngredientAnalysisResponse ratedGood,
    @NotNull IngredientAnalysisResponse ratedBad,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) IngredientAnalysisResponse ratedBadAcrossSkinTypes,
    @NotNull List<CautionIngredientResponse> productCautionIngredients) {

    public static IngredientAnalysisPreviewResponse from(ShelfRatingPreview preview) {
        return new IngredientAnalysisPreviewResponse(
            IngredientAnalysisResponse.from(preview.withoutRating()),
            IngredientAnalysisResponse.from(preview.ratedGood()),
            IngredientAnalysisResponse.from(preview.ratedBad()),
            preview.ratedBadAcrossSkinTypes().map(IngredientAnalysisResponse::from).orElse(null),
            preview.productCautionIngredients().stream().map(CautionIngredientResponse::from).toList()
        );
    }
}
