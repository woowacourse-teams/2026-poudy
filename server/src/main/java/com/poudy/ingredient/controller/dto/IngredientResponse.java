package com.poudy.ingredient.controller.dto;

import com.poudy.ingredient.domain.Ingredient;
import com.poudy.tag.controller.dto.SkinEffectResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record IngredientResponse(
        @NotNull @Schema(description = "성분 ID", example = "1012") Long id,
        @NotNull @Schema(description = "성분 한글명", example = "글리세린") String koreanName,
        @NotNull @Schema(description = "성분 영문명", example = "Glycerin") String englishName,
        @NotNull @Schema(description = "피부 작용 태그 (BIOLOGICAL_EFFECT)") List<SkinEffectResponse> skinEffects) {

    public static IngredientResponse from(Ingredient ingredient) {
        // spotless:off
        return new IngredientResponse(
                ingredient.id(),
                ingredient.koreanName(),
                ingredient.englishName(),
                SkinEffectResponse.from(ingredient.skinEffects()));
        // spotless:on
    }
}
