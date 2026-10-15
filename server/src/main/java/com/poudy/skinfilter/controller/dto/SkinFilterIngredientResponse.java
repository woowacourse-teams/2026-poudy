package com.poudy.skinfilter.controller.dto;

import com.poudy.ingredient.domain.Ingredient;
import com.poudy.tag.controller.dto.FormulationRoleResponse;
import com.poudy.tag.controller.dto.SkinEffectResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record SkinFilterIngredientResponse(
    @NotNull @Schema(example = "3551") Long id,
    @NotNull @Schema(example = "페녹시에탄올") String koreanName,
    @NotNull List<FormulationRoleResponse> formulationRoles,
    @NotNull List<SkinEffectResponse> skinEffects) {

    public static SkinFilterIngredientResponse from(Ingredient ingredient) {
        return new SkinFilterIngredientResponse(
            ingredient.id(),
            ingredient.koreanName(),
            FormulationRoleResponse.from(ingredient.formulationRoles()),
            SkinEffectResponse.from(ingredient.skinEffects())
        );
    }
}
