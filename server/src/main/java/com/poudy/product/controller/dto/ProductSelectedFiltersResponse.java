package com.poudy.product.controller.dto;

import com.poudy.product.domain.ProductSelectedFilters;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ProductSelectedFiltersResponse(
    @NotNull @Schema(description = "요청한 브랜드 중 존재하는 값의 ID와 이름. 요청 순서를 유지하고 후보에 없어도 포함한다") List<ProductFilterSelectionResponse> brands,
    @NotNull @Schema(description = "요청한 카테고리 중 존재하는 값의 ID와 이름. 요청 순서의 평탄한 목록이며 선택하지 않은 부모는 포함하지 않는다") List<ProductFilterSelectionResponse> categories) {

    public static ProductSelectedFiltersResponse from(ProductSelectedFilters filters) {
        if (filters == null) {
            return null;
        }
        return new ProductSelectedFiltersResponse(
            filters.brands().stream().map(brand -> new ProductFilterSelectionResponse(brand.id(), brand.koreanName()))
                .toList(),
            filters.categories().stream()
                .map(category -> new ProductFilterSelectionResponse(category.id(), category.name())).toList()
        );
    }
}
