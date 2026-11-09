package com.poudy.product.controller.dto;

import com.poudy.brand.controller.dto.BrandResponse;
import com.poudy.category.controller.dto.CategoryResponse;
import com.poudy.product.domain.ProductFilterOptions;
import com.poudy.skintype.controller.dto.SkinChoiceResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ProductFilterOptionsResponse(
    @NotNull @Schema(description = "브랜드 조건 전체만 제외한 전체 일치 제품의 브랜드") List<BrandResponse> brands,
    @NotNull @Schema(description = "카테고리 조건 전체만 제외한 전체 일치 제품의 카테고리와 제품 수") List<CategoryResponse> categories,
    @NotNull @Schema(description = "피부 타입과 민감성 조건을 모두 제외한 전체 일치 제품의 피부 선택지. 건성, 지성, 복합성, 민감성 순서이며 민감성 피부용 제품이 있으면 SENSITIVE를 포함한다") List<SkinChoiceResponse> skinChoices,
    @NotNull @Schema(description = "자기 마크 그룹 조건만 제외한 선택값과 제품 수. UV_FILTER_TYPE(자외선 차단 유형)은 OR, PRODUCT_FEATURE(제품 특성: 이지워시·워터프루프·다이소)는 AND. 그룹 간 AND") List<MarkGroupOptionResponse> markGroups) {

    public static ProductFilterOptionsResponse from(ProductFilterOptions options) {
        if (options == null) {
            return null;
        }
        return new ProductFilterOptionsResponse(
            options.brands().stream().map(BrandResponse::from).toList(),
            options.categories().stream().map(CategoryResponse::from).toList(),
            options.skinChoices().stream().map(SkinChoiceResponse::from).toList(),
            options.markGroups().stream().map(MarkGroupOptionResponse::from).toList()
        );
    }
}
