package com.poudy.product.controller.dto;

import com.poudy.ingredient.domain.Ingredients;
import com.poudy.ingredientgroup.domain.IngredientBundle;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record SkinEffectItemResponse(
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) IngredientGroupSummaryResponse ingredientGroup,
    @NotNull List<SkinEffectIngredientResponse> ingredients) {

    public static List<SkinEffectItemResponse> from(List<IngredientBundle> bundles, Ingredients ingredients) {
        return bundles.stream()
            .map(
                bundle -> new SkinEffectItemResponse(
                    IngredientGroupSummaryResponse.from(bundle.group()),
                    SkinEffectIngredientResponse.from(bundle.ingredientIds(), ingredients)
                )
            )
            .toList();
    }
}
