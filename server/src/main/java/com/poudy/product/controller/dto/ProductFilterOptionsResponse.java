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
    @NotNull @Schema(description = "피부 타입과 민감성 조건을 모두 제외한 전체 일치 제품의 피부 타입") List<SkinTypeResponse> skinTypes,
    @NotNull @Schema(description = "피부 타입과 민감성 조건을 모두 제외한 전체 일치 제품 중 민감성 피부용 제품이 있는지 여부") Boolean sensitiveSkin,
    @NotNull @Schema(description = "자기 속성 그룹 조건만 제외한 선택값과 제품 수") List<ProductAttributeOptionResponse> attributes) {

    public static ProductFilterOptionsResponse from(ProductFilterOptions options) {
        if (options == null) {
            return null;
        }
        return new ProductFilterOptionsResponse(
            options.brands().stream().map(BrandResponse::from).toList(),
            options.categories().stream().map(CategoryResponse::from).toList(),
            options.skinTypes().stream().map(SkinTypeResponse::from).toList(),
            options.sensitiveSkin(),
            options.attributes().stream().map(ProductAttributeOptionResponse::from).toList()
        );
    }
}
