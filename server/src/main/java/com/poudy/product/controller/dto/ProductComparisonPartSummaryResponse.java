package com.poudy.product.controller.dto;

import com.poudy.product.domain.ProductPart;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record ProductComparisonPartSummaryResponse(
    @NotNull Long id,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) String name) {

    public static ProductComparisonPartSummaryResponse from(ProductPart part) {
        return new ProductComparisonPartSummaryResponse(part.id(), part.name());
    }
}
