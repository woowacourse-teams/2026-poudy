package com.poudy.product.controller.dto;

import com.poudy.brand.domain.BrandProductCount;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record ProductBrandOptionResponse(
    @NotNull Long id,
    @NotNull String name,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) String englishName,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) String imageUrl,
    @NotNull @Schema(description = "브랜드 조건 전체만 제외한 제품 수. 선택한 브랜드는 0개여도 포함한다") Long productCount) {

    public static ProductBrandOptionResponse from(BrandProductCount brand) {
        return new ProductBrandOptionResponse(
            brand.id(),
            brand.koreanName(),
            brand.englishName(),
            brand.imageUrl(),
            brand.productCount()
        );
    }
}
