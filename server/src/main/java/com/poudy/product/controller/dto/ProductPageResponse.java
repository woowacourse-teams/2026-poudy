package com.poudy.product.controller.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.poudy.brand.controller.dto.BrandResponse;
import com.poudy.category.controller.dto.CategoryResponse;
import com.poudy.common.dto.PaginationRequest;
import com.poudy.common.dto.PaginationResponse;
import com.poudy.product.domain.ProductPage;
import com.poudy.skintype.controller.dto.SkinTypeResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ProductPageResponse(
    @NotNull List<ProductResponse> items,
    @NotNull PaginationResponse pagination,
    @NotNull @Schema(description = "조회 조건에 해당하는 제품 전체의 브랜드. 페이지에 걸리지 않고 결과 전체를 기준으로 한다") List<BrandResponse> brands,
    @NotNull @Schema(description = "조회 조건에 해당하는 제품 전체의 카테고리와 제품 수. 페이지에 걸리지 않고 결과 전체를 기준으로 한다") List<CategoryResponse> categories,
    @NotNull @Schema(description = "조회 조건에 해당하는 제품 전체의 피부타입. 페이지에 걸리지 않고 결과 전체를 기준으로 한다") List<SkinTypeResponse> skinTypes,
    @JsonInclude(JsonInclude.Include.NON_NULL) @Schema(description = "첫 페이지(page=1)에만 포함. 각 자기 조건만 제외한 전체 제품의 후보. 후속 페이지는 계산과 필드 전송을 생략하며 빈 배열과 구별한다", requiredMode = Schema.RequiredMode.NOT_REQUIRED) ProductFilterOptionsResponse filterOptions) {

    public static ProductPageResponse from(ProductPage page, PaginationRequest pagination) {
        return new ProductPageResponse(
            page.items().stream()
                .map(ProductResponse::from)
                .toList(),
            PaginationResponse.of(pagination, page.totalElements()),
            page.brands().stream()
                .map(BrandResponse::from)
                .toList(),
            page.categories().stream()
                .map(CategoryResponse::from)
                .toList(),
            page.skinTypes().stream()
                .map(SkinTypeResponse::from)
                .toList(),
            ProductFilterOptionsResponse.from(page.filterOptions())
        );
    }
}
