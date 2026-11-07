package com.poudy.product.controller.dto;

import com.poudy.ingredient.controller.dto.IngredientNameResponse;
import com.poudy.product.domain.ProductComparisonCaution;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ProductComparisonCautionResponse(
    @NotNull String code,
    @NotNull String name,
    @NotNull Boolean contains,
    @NotNull List<IngredientNameResponse> ingredients) {

    public static ProductComparisonCautionResponse from(ProductComparisonCaution caution) {
        return new ProductComparisonCautionResponse(
            caution.code().value(),
            caution.name(),
            caution.contains(),
            caution.ingredients().stream().map(IngredientNameResponse::from).toList()
        );
    }
}
