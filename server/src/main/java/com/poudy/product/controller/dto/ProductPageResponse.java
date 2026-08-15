package com.poudy.product.controller.dto;

import com.poudy.brand.controller.dto.BrandResponse;
import com.poudy.common.dto.PaginationRequest;
import com.poudy.common.dto.PaginationResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ProductPageResponse(
        @NotNull List<ProductResponse> items,
        @NotNull PaginationResponse pagination,
        @NotNull @Schema(description = "조회 조건에 해당하는 제품 전체의 브랜드. 페이지에 걸리지 않고 결과 전체를 기준으로 한다") List<BrandResponse> brands) {

    public static ProductPageResponse sample(PaginationRequest pagination) {
        List<ProductResponse> items = ProductResponse.samples();

        return new ProductPageResponse(
                items,
                PaginationResponse.of(pagination, items.size()),
                List.of(BrandResponse.sample()));
    }
}
