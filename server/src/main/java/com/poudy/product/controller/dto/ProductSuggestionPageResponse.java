package com.poudy.product.controller.dto;

import com.poudy.common.dto.PaginationRequest;
import com.poudy.common.dto.PaginationResponse;
import com.poudy.product.domain.ProductSuggestionPage;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ProductSuggestionPageResponse(
    @NotNull @Schema(description = "제품명 또는 브랜드명 검색어에 해당하는 제품") List<ProductSuggestionResponse> items,
    @NotNull PaginationResponse pagination) {

    public static ProductSuggestionPageResponse from(ProductSuggestionPage page, PaginationRequest pagination) {
        return new ProductSuggestionPageResponse(
            page.items().stream()
                .map(ProductSuggestionResponse::from)
                .toList(),
            PaginationResponse.of(pagination, page.totalElements())
        );
    }
}
