package com.poudy.shelf.controller.dto;

import com.poudy.shelf.domain.AnalyzedIngredient;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record IngredientAnalysisItemResponse(
    @NotNull @Schema(example = "3551") Long id,
    @NotNull @Schema(example = "페녹시에탄올") String koreanName,
    @NotNull List<IngredientAnalysisProductResponse> products,
    @NotNull @Schema(example = "true") Boolean inFilter,
    @NotNull @Schema(example = "false") Boolean isNew) {

    public static IngredientAnalysisItemResponse from(AnalyzedIngredient analyzed) {
        return new IngredientAnalysisItemResponse(
            analyzed.ingredient().id(),
            analyzed.ingredient().koreanName(),
            analyzed.products().stream().map(IngredientAnalysisProductResponse::from).toList(),
            analyzed.inFilter(),
            analyzed.isNew()
        );
    }
}
