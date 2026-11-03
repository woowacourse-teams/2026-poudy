package com.poudy.product.controller.dto;

import com.poudy.brand.controller.dto.BrandResponse;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.ProductComparisonItem;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ProductComparisonItemResponse(
    @NotNull Long id,
    @NotNull String name,
    @NotNull BrandResponse brand,
    @NotNull String imageUrl,
    @NotNull List<ProductComparisonVariantResponse> variants,
    @NotNull List<ProductComparisonPartSummaryResponse> productParts,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) ProductComparisonPartResponse selectedPart) {

    public static ProductComparisonItemResponse from(ProductComparisonItem item) {
        Product product = item.product();
        return new ProductComparisonItemResponse(
            product.id(),
            product.name(),
            BrandResponse.from(product.brand()),
            product.imageUrl(),
            product.variants().values().stream().map(ProductComparisonVariantResponse::from).toList(),
            product.parts().stream().map(ProductComparisonPartSummaryResponse::from).toList(),
            ProductComparisonPartResponse.from(item)
        );
    }
}
