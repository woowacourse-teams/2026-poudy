package com.poudy.product.controller.dto;

import com.poudy.ingredient.domain.Ingredient;
import com.poudy.tag.controller.dto.FormulationRoleResponse;
import com.poudy.tag.controller.dto.SkinEffectResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record UnsuitableIngredientResponse(
    @NotNull @Schema(example = "3551") Long id,
    @NotNull @Schema(example = "페녹시에탄올") String koreanName,
    @NotNull @Schema(example = "Phenoxyethanol") String englishName,
    @NotNull List<FormulationRoleResponse> formulationRoles,
    @NotNull List<SkinEffectResponse> skinEffects) {

    public static List<UnsuitableIngredientResponse> from(List<Ingredient> ingredients) {
        return ingredients.stream()
            .map(
                ingredient -> new UnsuitableIngredientResponse(
                    ingredient.id(),
                    ingredient.koreanName(),
                    ingredient.englishName(),
                    FormulationRoleResponse.from(ingredient.formulationRoles()),
                    SkinEffectResponse.from(ingredient.skinEffects())
                )
            )
            .toList();
    }
}
