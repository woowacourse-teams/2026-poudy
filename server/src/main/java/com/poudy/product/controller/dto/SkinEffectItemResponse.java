package com.poudy.product.controller.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.ingredientgroup.domain.IngredientBundle;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record SkinEffectItemResponse(
    @JsonInclude(JsonInclude.Include.NON_NULL) IngredientGroupSummaryResponse ingredientGroup,
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
