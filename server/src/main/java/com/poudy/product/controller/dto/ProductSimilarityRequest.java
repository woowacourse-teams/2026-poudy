package com.poudy.product.controller.dto;

import com.poudy.product.domain.ProductSimilaritySort;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.Objects;

public record ProductSimilarityRequest(
    @Min(1) @Max(10) @Schema(description = "유사도 상위 후보 수. 이 후보를 확정한 뒤 정렬한다", defaultValue = "3") Integer size,
    @Schema(description = "확정한 후보 안에서의 정렬. 가격 동점은 기존 유사도 순서를 유지한다", defaultValue = "SIMILARITY") ProductSimilaritySort sort) {

    public ProductSimilarityRequest {
        size = Objects.requireNonNullElse(size, 3);
        sort = Objects.requireNonNullElse(sort, ProductSimilaritySort.SIMILARITY);
    }
}
