package com.poudy.product.controller.dto;

import com.poudy.product.domain.ProductComparison;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ProductComparisonResponse(
    @NotNull List<ProductComparisonItemResponse> items) {

    public static ProductComparisonResponse from(ProductComparison comparison) {
        return new ProductComparisonResponse(
            comparison.items().stream().map(ProductComparisonItemResponse::from).toList()
        );
    }
}
