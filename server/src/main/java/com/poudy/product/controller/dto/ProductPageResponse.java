package com.poudy.product.controller.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.poudy.common.dto.PaginationRequest;
import com.poudy.common.dto.PaginationResponse;
import com.poudy.product.domain.ProductPage;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ProductPageResponse(
    @NotNull List<ProductResponse> items,
    @NotNull PaginationResponse pagination,
    @JsonInclude(JsonInclude.Include.NON_NULL) @Schema(description = "첫 페이지(page=1)에만 포함. 각 자기 조건만 제외한 전체 제품의 후보. 후속 페이지는 계산과 필드 전송을 생략하며 빈 배열과 구별한다", requiredMode = Schema.RequiredMode.NOT_REQUIRED) ProductFilterOptionsResponse filterOptions,
    @JsonInclude(JsonInclude.Include.NON_NULL) @Schema(description = "첫 페이지(page=1)에만 포함. 후보 및 제품 결과와 무관하게 선택한 브랜드·카테고리의 ID와 이름을 제공한다. 없는 ID는 생략하고 검색 조건은 그대로 유지한다. 선택이 없으면 빈 배열이며 후속 페이지는 계산과 필드 전송을 생략한다", requiredMode = Schema.RequiredMode.NOT_REQUIRED) ProductSelectedFiltersResponse selectedFilters) {

    public static ProductPageResponse from(ProductPage page, PaginationRequest pagination) {
        return new ProductPageResponse(
            page.items().stream()
                .map(ProductResponse::from)
                .toList(),
            PaginationResponse.of(pagination, page.totalElements()),
            ProductFilterOptionsResponse.from(page.filterOptions()),
            ProductSelectedFiltersResponse.from(page.selectedFilters())
        );
    }
}
