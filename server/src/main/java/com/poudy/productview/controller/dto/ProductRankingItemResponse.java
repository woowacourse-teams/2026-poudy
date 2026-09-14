package com.poudy.productview.controller.dto;

import com.poudy.product.domain.Product;
import jakarta.validation.constraints.NotNull;

public record ProductRankingItemResponse(@NotNull ProductRankingProductResponse product) {

    public static ProductRankingItemResponse from(Product product) {
        return new ProductRankingItemResponse(ProductRankingProductResponse.from(product));
    }
}
