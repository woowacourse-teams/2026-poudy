package com.poudy.brand.controller.dto;

import com.poudy.product.domain.BrandProductCount;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record BrandSummaryResponse(
    @NotNull @Schema(description = "브랜드 ID", example = "12") Long id,
    @NotNull @Schema(description = "브랜드 한글명", example = "브랜드 이름") String name,
    @Schema(description = "브랜드 영문명", example = "BRAND NAME", nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) String englishName,
    @Schema(description = "브랜드 이미지 URL", example = "https://cdn.example.com/brands/12/image.png", nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) String imageUrl,
    @NotNull @Schema(description = "이 브랜드의 제품 수. 전체 카탈로그 기준이며 제품 조회 필터와 무관하다", example = "27") Long productCount) {

    public static BrandSummaryResponse from(BrandProductCount brandProductCount) {
        return new BrandSummaryResponse(
            brandProductCount.id(),
            brandProductCount.koreanName(),
            brandProductCount.englishName(),
            brandProductCount.imageUrl(),
            brandProductCount.productCount()
        );
    }
}
