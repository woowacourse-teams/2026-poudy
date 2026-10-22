package com.poudy.shelf.controller.dto;

import com.poudy.common.dto.PaginationRequest;
import com.poudy.common.dto.PaginationResponse;
import com.poudy.product.domain.ProductSuggestions;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ShelfProductSuggestionPageResponse(
    @NotNull List<ShelfProductSuggestionResponse> items,
    @NotNull PaginationResponse pagination) {

    public static ShelfProductSuggestionPageResponse from(ProductSuggestions page, PaginationRequest pagination) {
        return new ShelfProductSuggestionPageResponse(
            page.items().stream()
                .map(ShelfProductSuggestionResponse::from)
                .toList(),
            PaginationResponse.of(pagination, page.totalElements())
        );
    }
}
