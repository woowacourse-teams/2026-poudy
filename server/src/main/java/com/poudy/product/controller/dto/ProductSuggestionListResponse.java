package com.poudy.product.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ProductSuggestionListResponse(
        @NotNull @Schema(description = "검색어에 해당하는 제품") List<ProductSuggestionResponse> items) {

    public static ProductSuggestionListResponse sample() {
        return new ProductSuggestionListResponse(List.of(ProductSuggestionResponse.sample(ProductResponse.SAMPLE_ID)));
    }
}
