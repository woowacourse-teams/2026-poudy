package com.poudy.product.controller.dto;

import com.poudy.product.domain.ProductComparison;
import com.poudy.product.domain.ProductComparisonFilterStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ProductComparisonResponse(
    @NotNull @Schema(description = "GUEST: 비로그인, EMPTY: 저장된 제외 성분 없음, NOT_EMPTY: 저장된 제외 성분 있음. NOT_EMPTY이고 구성품의 myFilterIngredients가 비어 있으면 해당 성분 없음") ProductComparisonFilterStatus myFilterStatus,
    @NotNull List<ProductComparisonItemResponse> items) {

    public static ProductComparisonResponse from(ProductComparison comparison) {
        return new ProductComparisonResponse(
            comparison.myFilterStatus(),
            comparison.items().stream().map(ProductComparisonItemResponse::from).toList()
        );
    }
}
