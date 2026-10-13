package com.poudy.storage.controller.dto;

import com.poudy.product.controller.dto.ProductResponse;
import com.poudy.product.domain.Product;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record SavedProductsResponse(@NotNull List<ProductResponse> items) {

    public static SavedProductsResponse from(List<Product> products) {
        return new SavedProductsResponse(products.stream().map(ProductResponse::from).toList());
    }
}
