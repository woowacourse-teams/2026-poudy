package com.poudy.shelf.controller.dto;

import com.poudy.product.domain.Product;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record IngredientAnalysisProductResponse(
    @NotNull @Schema(example = "205") Long id,
    @NotNull @Schema(example = "1025 독도 크림") String name,
    @NotNull @Schema(example = "https://cdn.example.com/products/205.png") String imageUrl) {

    public static IngredientAnalysisProductResponse from(Product product) {
        return new IngredientAnalysisProductResponse(product.id(), product.name(), product.imageUrl());
    }
}
