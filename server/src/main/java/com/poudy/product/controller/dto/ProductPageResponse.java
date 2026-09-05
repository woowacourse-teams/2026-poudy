package com.poudy.product.controller.dto;

import com.poudy.brand.controller.dto.BrandResponse;
import com.poudy.category.controller.dto.CategoryResponse;
import com.poudy.common.dto.PaginationRequest;
import com.poudy.common.dto.PaginationResponse;
import com.poudy.product.domain.ProductPage;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ProductPageResponse(
    @NotNull List<ProductResponse> items,
    @NotNull PaginationResponse pagination,
    @NotNull @Schema(description = "조회 조건에 해당하는 제품 전체의 브랜드. 페이지에 걸리지 않고 결과 전체를 기준으로 한다") List<BrandResponse> brands,
    @NotNull @Schema(description = "조회 조건에 해당하는 제품 전체의 카테고리와 제품 수. 페이지에 걸리지 않고 결과 전체를 기준으로 한다") List<CategoryResponse> categories) {

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
                .toList()
        );
    }
}
