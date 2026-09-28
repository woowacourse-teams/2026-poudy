package com.poudy.product.controller.dto;

import com.poudy.brand.controller.dto.BrandResponse;
import com.poudy.category.controller.dto.CategoryResponse;
import com.poudy.product.domain.ProductFilterOptions;
import com.poudy.skintype.controller.dto.SkinTypeResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ProductFilterOptionsResponse(
    @NotNull @Schema(description = "브랜드 조건 전체만 제외한 전체 일치 제품의 브랜드") List<BrandResponse> brands,
    @NotNull @Schema(description = "카테고리 조건 전체만 제외한 전체 일치 제품의 카테고리와 제품 수") List<CategoryResponse> categories,
    @NotNull @Schema(description = "피부 타입 조건만 제외한 전체 일치 제품의 피부 타입") List<SkinTypeResponse> skinTypes) {

    public static ProductFilterOptionsResponse from(ProductFilterOptions options) {
        if (options == null) {
            return null;
        }
        return new ProductFilterOptionsResponse(
            options.brands().stream().map(BrandResponse::from).toList(),
            options.categories().stream().map(CategoryResponse::from).toList(),
            options.skinTypes().stream().map(SkinTypeResponse::from).toList()
        );
    }
}
