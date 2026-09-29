package com.poudy.product.controller.dto;

import com.poudy.ingredientgroup.domain.IngredientGroup;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record IngredientGroupSummaryResponse(
    @NotNull @Schema(example = "CERAMIDES") String code,
    @NotNull @Schema(example = "세라마이드") String name) {

    public static IngredientGroupSummaryResponse from(IngredientGroup group) {
        if (group == null) {
            return null;
        }

        return new IngredientGroupSummaryResponse(group.code(), group.name());
    }
}
