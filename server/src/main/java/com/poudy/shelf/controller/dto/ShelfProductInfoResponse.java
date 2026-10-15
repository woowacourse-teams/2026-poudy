package com.poudy.shelf.controller.dto;

import com.poudy.product.domain.Product;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record ShelfProductInfoResponse(
    @NotNull @Schema(example = "101") Long id,
    @NotNull @Schema(example = "독도 토너") String name,
    @NotNull @Schema(example = "라운드랩") String brandName,
    @NotNull @Schema(example = "https://cdn.example.com/products/101.png") String imageUrl) {

    public static ShelfProductInfoResponse from(Product product) {
        return new ShelfProductInfoResponse(
            product.id(),
            product.name(),
            product.brand().koreanName(),
            product.imageUrl()
        );
    }
}
