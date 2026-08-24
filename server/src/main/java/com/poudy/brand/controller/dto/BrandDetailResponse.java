package com.poudy.brand.controller.dto;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.BrandDetail;
import com.poudy.category.controller.dto.CategoryChildResponse;
import com.poudy.category.controller.dto.CategoryResponse;
import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import com.poudy.product.domain.ProductCountsByCategory;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record BrandDetailResponse(
        @NotNull @Schema(description = "브랜드 ID", example = "12") Long id,
        @NotNull @Schema(description = "브랜드 한글명", example = "브랜드 이름") String name,
        @Schema(description = "브랜드 영문명", example = "BRAND NAME", nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) String englishName,
        @Schema(description = "브랜드 이미지 URL", example = "https://cdn.example.com/brands/12/image.png", nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) String imageUrl,
        @NotNull @Schema(description = "이 브랜드 제품이 속한 카테고리를 대분류와 소분류로 표시한다. productCount 는 이 브랜드 안에서 센 값이다") List<CategoryResponse> categories) {

    public static BrandDetailResponse from(BrandDetail brandDetail) {
        Brand brand = brandDetail.brand();
        Categories categories = brandDetail.categories();
        ProductCountsByCategory productCounts = brandDetail.productCountsByCategory();
        List<CategoryResponse> categoryResponses = categories.parents().stream()
                .filter(category -> productCounts.countOf(category) > 0)
                .map(category -> categoryFrom(category, categories, productCounts))
                .toList();

        return new BrandDetailResponse(
                brand.id(),
                brand.koreanName(),
                brand.englishName(),
                brand.imageUrl(),
                categoryResponses);
    }

    private static CategoryResponse categoryFrom(
            Category category,
            Categories categories,
            ProductCountsByCategory productCounts) {
        List<CategoryChildResponse> children = categories.childrenOf(category).stream()
                .filter(child -> productCounts.countOf(child) > 0)
                .map(
                        child -> new CategoryChildResponse(
                                child.id(),
                                child.name(),
                                productCounts.countOf(child)))
                .toList();

        return new CategoryResponse(
                category.id(),
                category.name(),
                children,
                productCounts.countOf(category));
    }
}
