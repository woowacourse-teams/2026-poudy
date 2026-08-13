package com.poudy.product.dto;

import com.poudy.ingredient.dto.EffectResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ProductIngredientResponse(
        @NotNull @Schema(example = "1005") Long id,
        @NotNull @Schema(example = "글리세린") String koreanName,
        @NotNull @Schema(example = "Glycerin") String englishName,
        @NotNull List<EffectResponse> effects) {
}
