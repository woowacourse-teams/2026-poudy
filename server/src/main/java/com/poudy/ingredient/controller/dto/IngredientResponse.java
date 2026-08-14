package com.poudy.ingredient.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record IngredientResponse(
        @NotNull @Schema(description = "성분 ID", example = "1005") Long id,
        @NotNull @Schema(description = "성분 한글명", example = "글리세린") String koreanName,
        @NotNull @Schema(description = "성분 영문명", example = "Glycerin") String englishName,
        @NotNull @Schema(description = "성분의 주요 효과") List<EffectResponse> effects) {
}
