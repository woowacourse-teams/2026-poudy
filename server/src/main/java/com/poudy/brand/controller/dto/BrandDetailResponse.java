package com.poudy.brand.controller.dto;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.BrandDetail;
import com.poudy.category.controller.dto.CategoryChildResponse;
import com.poudy.category.controller.dto.CategoryResponse;
import com.poudy.category.domain.Category;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.Objects;

public record BrandDetailResponse(
        @NotNull @Schema(description = "브랜드 ID", example = "12") Long id,
        @NotNull @Schema(description = "브랜드 한글명", example = "브랜드 이름") String name,
        @NotNull @Schema(description = "브랜드 영문명", example = "BRAND NAME") String englishName,
        @NotNull @Schema(description = "브랜드 이미지 URL", example = "https://cdn.example.com/brands/12/image.png") String imageUrl,
        @NotNull @Schema(description = "이 브랜드 제품이 속한 카테고리를 대분류와 소분류로 표시한다. productCount 는 이 브랜드 안에서 센 값이다") List<CategoryResponse> categories) {

    public static BrandDetailResponse from(BrandDetail brandDetail) {
        Brand brand = brandDetail.brand();
        List<CategoryResponse> categories = brandDetail.categories().stream()
                .map(category -> categoryFrom(category, brandDetail))
                .toList();

        return new BrandDetailResponse(
                brand.id(),
                brand.koreanName(),
                Objects.requireNonNullElse(brand.englishName(), ""),
                Objects.requireNonNullElse(brand.imageUrl(), ""),
                categories);
    }

    private static CategoryResponse categoryFrom(Category category, BrandDetail brandDetail) {
        List<CategoryChildResponse> children = brandDetail.childrenOf(category).stream()
                .map(
                        child -> new CategoryChildResponse(
                                child.id(),
                                child.name(),
                                brandDetail.productCountOf(child)))
                .toList();

        return new CategoryResponse(
                category.id(),
                category.name(),
                children,
                brandDetail.productCountOf(category));
    }
}
