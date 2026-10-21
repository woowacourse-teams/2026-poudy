package com.poudy.ingredient.controller.dto;

import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.IngredientSuggestion;
import com.poudy.tag.controller.dto.FormulationRoleResponse;
import com.poudy.tag.controller.dto.SkinEffectResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record IngredientSuggestionResponse(
    @NotNull @Schema(description = "성분 ID", example = "2") Long id,
    @NotNull @Schema(description = "성분 한글명", example = "가지열매추출물") String koreanName,
    @NotNull @Schema(description = "성분 영문명", example = "Solanum Melongena (Eggplant) Fruit Extract") String englishName,
    @NotNull @Schema(description = "배합 목적 태그 (CosIng FUNCTION). 해당하는 배합 목적이 없으면 빈 배열이다") List<FormulationRoleResponse> formulationRoles,
    @NotNull @Schema(description = "피부 작용 태그 (BIOLOGICAL_EFFECT)") List<SkinEffectResponse> skinEffects,
    @NotNull @Schema(description = "검색어가 실제로 일치한 필드와 원문 구간") IngredientSuggestionMatchResponse match) {

    public static IngredientSuggestionResponse from(IngredientSuggestion matched) {
        Ingredient ingredient = matched.ingredient();
        return new IngredientSuggestionResponse(
            ingredient.id(),
            ingredient.koreanName(),
            ingredient.englishName(),
            FormulationRoleResponse.from(ingredient.formulationRoles()),
            SkinEffectResponse.from(ingredient.skinEffects()),
            IngredientSuggestionMatchResponse.from(matched)
        );
    }
}
