package com.poudy.product.controller.dto;

import com.poudy.product.domain.ProductSimilarities;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ProductSimilarityResponse(
    @Schema(description = "기준 구성품 ID. 구성품이 없으면 null", nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) Long partId,
    @NotNull @Schema(description = "기준 구성품 계산 완료 여부. true여도 후보가 없으면 items는 빈 배열") Boolean calculated,
    @NotNull @Schema(description = "최종 점수 0.25 이상인 판매 중 제품, 점수 내림차순 최대 3개") List<SimilarProductResponse> items) {
    public static ProductSimilarityResponse from(ProductSimilarities result) {
        return new ProductSimilarityResponse(
            result.partId(),
            result.calculated(),
            result.items().stream()
                .map(item -> SimilarProductResponse.from(item, result.excludeCodes())).toList()
        );
    }
}
