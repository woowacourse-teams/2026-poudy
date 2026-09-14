package com.poudy.productview.controller.dto;

import com.poudy.product.domain.Product;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ProductRankingResponse(@NotNull List<ProductRankingItemResponse> items) {

    public static ProductRankingResponse from(List<Product> products) {
        return new ProductRankingResponse(products.stream().map(ProductRankingItemResponse::from).toList());
    }
}
