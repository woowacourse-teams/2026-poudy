package com.poudy.product.controller.dto;

import com.poudy.product.domain.ProductComparison;
import com.poudy.product.domain.ProductComparisonFilterStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ProductComparisonResponse(
    @NotNull @Schema(description = "ANONYMOUS: 비로그인, NOT_CONFIGURED: 필터 미설정, CONFIGURED: 필터 설정됨. CONFIGURED이고 구성품의 myFilterIngredients가 비어 있으면 해당 성분 없음") ProductComparisonFilterStatus myFilterStatus,
    @NotNull List<ProductComparisonItemResponse> items) {

    public static ProductComparisonResponse from(ProductComparison comparison) {
        return new ProductComparisonResponse(
            comparison.myFilterStatus(),
            comparison.items().stream().map(ProductComparisonItemResponse::from).toList()
        );
    }
}
