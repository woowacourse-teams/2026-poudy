package com.poudy.shelf.controller.dto;

import com.poudy.shelf.domain.CautionIngredient;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record CautionIngredientResponse(
    @NotNull @Schema(example = "3551") Long id,
    @NotNull @Schema(example = "페녹시에탄올") String koreanName,
    @NotNull List<IngredientAnalysisReasonResponse> reasons) {

    public static CautionIngredientResponse from(CautionIngredient ingredient) {
        return new CautionIngredientResponse(
            ingredient.id(),
            ingredient.koreanName(),
            ingredient.reasons().stream().map(IngredientAnalysisReasonResponse::from).toList()
        );
    }
}
