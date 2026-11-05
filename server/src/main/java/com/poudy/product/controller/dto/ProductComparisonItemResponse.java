package com.poudy.product.controller.dto;

import com.poudy.brand.controller.dto.BrandResponse;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.ProductComparisonItem;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;
import java.util.List;

public record ProductComparisonItemResponse(
    @NotNull Long id,
    @NotNull String name,
    @NotNull BrandResponse brand,
    @NotNull List<CategoryPathResponse> categories,
    @NotNull @Schema(description = "제품에 연결된 전체 표식, 없으면 빈 배열") List<MarkResponse> marks,
    @NotNull String imageUrl,
    @NotNull List<ProductVariantResponse> variants,
    @NotNull List<ProductComparisonPartSummaryResponse> productParts,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) ProductComparisonPartResponse selectedPart,
    @NotNull OffsetDateTime updatedAt) {

    public static ProductComparisonItemResponse from(ProductComparisonItem item) {
        Product product = item.product();
        return new ProductComparisonItemResponse(
            product.id(),
            product.name(),
            BrandResponse.from(product.brand()),
            CategoryPathResponse.from(item.categoryPath()),
            MarkResponse.from(product.marks()),
            product.imageUrl(),
            ProductVariantResponse.from(product.variants().values()),
            product.parts().stream().map(ProductComparisonPartSummaryResponse::from).toList(),
            ProductComparisonPartResponse.from(item),
            product.updatedAt()
        );
    }
}
