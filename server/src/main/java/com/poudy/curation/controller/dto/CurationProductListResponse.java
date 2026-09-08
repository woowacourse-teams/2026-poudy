package com.poudy.curation.controller.dto;

import com.poudy.product.domain.Product;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record CurationProductListResponse(@NotNull List<CurationProductResponse> items) {

    public static CurationProductListResponse from(List<Product> products) {
        return new CurationProductListResponse(
            products.stream()
                .map(CurationProductResponse::from)
                .toList()
        );
    }
}
