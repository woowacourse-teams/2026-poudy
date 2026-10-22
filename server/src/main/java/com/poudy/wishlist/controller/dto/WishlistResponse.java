package com.poudy.wishlist.controller.dto;

import com.poudy.product.controller.dto.ProductResponse;
import com.poudy.product.domain.Product;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record WishlistResponse(@NotNull List<ProductResponse> items) {

    public static WishlistResponse from(List<Product> products) {
        return new WishlistResponse(products.stream().map(ProductResponse::from).toList());
    }
}
