package com.poudy.product.controller.dto;

import com.poudy.product.domain.ProductComparisonItem;
import com.poudy.product.domain.ProductPart;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ProductComparisonPartResponse(
    @NotNull Long id,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) String name,
    @NotNull List<ProductComparisonEffectResponse> skinEffects,
    @DecimalMin("0") @DecimalMax("3") @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED, multipleOf = 0.5) Double moistureLevel,
    @DecimalMin("0") @DecimalMax("3") @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED, multipleOf = 0.5) Double oilLevel,
    @NotNull List<ProductComparisonCautionResponse> cautionGroups,
    @NotNull List<ProductComparisonIngredientResponse> myFilterIngredients) {

    public static ProductComparisonPartResponse from(ProductComparisonItem item) {
        ProductPart part = item.selectedPart();
        if (part == null) {
            return null;
        }
        return new ProductComparisonPartResponse(
            part.id(),
            part.name(),
            item.skinEffects().stream().map(ProductComparisonEffectResponse::from).toList(),
            part.moistureLevel(),
            part.oilLevel(),
            item.cautionGroups().stream().map(ProductComparisonCautionResponse::from).toList(),
            item.myFilterIngredients().stream().map(ProductComparisonIngredientResponse::from).toList()
        );
    }
}
