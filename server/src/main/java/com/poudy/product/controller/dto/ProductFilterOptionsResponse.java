package com.poudy.product.controller.dto;

import com.poudy.category.controller.dto.CategoryResponse;
import com.poudy.product.domain.ProductFilterOptions;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ProductFilterOptionsResponse(
    @NotNull @Schema(description = "브랜드 조건 전체만 제외한 양수 후보와 실제로 존재하는 선택. 선택은 0개여도 포함한다") List<ProductBrandOptionResponse> brands,
    @NotNull @Schema(description = "카테고리 조건 전체만 제외한 양수 후보와 실제로 존재하는 선택 및 구조에 필요한 부모. 개수는 실제 집계값이다") List<CategoryResponse> categories,
    @NotNull @Schema(description = "피부 타입과 민감성 조건을 모두 제외한 양수 후보와 선택한 피부 선택지. 건성, 지성, 복합성, 민감성 순서다. 선택은 0개여도 포함한다") List<ProductSkinOptionResponse> skinOptions,
    @NotNull @Schema(description = "자기 마크 그룹 조건만 제외한 선택값과 제품 수. UV_FILTER_TYPE(자외선 차단 유형)은 OR, PRODUCT_FEATURE(제품 특성: 이지워시·워터프루프·다이소)는 AND. 그룹 간 AND") List<MarkGroupOptionResponse> markGroups) {

    public static ProductFilterOptionsResponse from(ProductFilterOptions options) {
        if (options == null) {
            return null;
        }
        return new ProductFilterOptionsResponse(
            options.brands().stream().map(ProductBrandOptionResponse::from).toList(),
            options.categories().stream().map(CategoryResponse::from).toList(),
            options.skinOptions().stream().map(ProductSkinOptionResponse::from).toList(),
            options.markGroups().stream().map(MarkGroupOptionResponse::from).toList()
        );
    }
}
