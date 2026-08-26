package com.poudy.brand.controller.dto;

import com.poudy.category.controller.dto.CategoryResponse;
import com.poudy.product.domain.BrandProductCounts;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record BrandDetailResponse(
        @NotNull @Schema(description = "브랜드 ID", example = "12") Long id,
        @NotNull @Schema(description = "브랜드 한글명", example = "브랜드 이름") String name,
        @Schema(description = "브랜드 영문명", example = "BRAND NAME", nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) String englishName,
        @Schema(description = "브랜드 이미지 URL", example = "https://cdn.example.com/brands/12/image.png", nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) String imageUrl,
        @NotNull @Schema(description = "이 브랜드 제품이 속한 카테고리를 대분류와 소분류로 표시한다. productCount 는 이 브랜드 안에서 센 값이다") List<CategoryResponse> categories) {

    public static BrandDetailResponse from(BrandProductCounts brandProductCounts) {
        List<CategoryResponse> categories = brandProductCounts.categories().stream()
                .map(CategoryResponse::from)
                .toList();

        return new BrandDetailResponse(
                brandProductCounts.id(),
                brandProductCounts.koreanName(),
                brandProductCounts.englishName(),
                brandProductCounts.imageUrl(),
                categories);
    }
}
