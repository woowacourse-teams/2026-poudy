package com.poudy.product.controller.dto;

import com.poudy.product.domain.Product;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ProductSuggestionListResponse(
        @NotNull @Schema(description = "제품명 또는 브랜드명 검색어에 해당하는 제품") List<ProductSuggestionResponse> items) {

    public static ProductSuggestionListResponse from(List<Product> products) {
        return new ProductSuggestionListResponse(
                products.stream()
                        .map(ProductSuggestionResponse::from)
                        .toList());
    }
}
