package com.poudy.routine.controller.dto;

import com.poudy.product.domain.Product;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record RoutineProductResponse(
    @NotNull @Schema(example = "101") Long id,
    @NotNull @Schema(example = "1025 독도 토너") String name,
    @NotNull @Schema(example = "라운드랩") String brandName,
    @NotNull @Schema(example = "https://cdn.example.com/products/101.png") String imageUrl) {

    public static RoutineProductResponse from(Product product) {
        return new RoutineProductResponse(
            product.id(),
            product.name(),
            product.brand().koreanName(),
            product.imageUrl()
        );
    }

    public static List<RoutineProductResponse> listOf(List<Product> products) {
        return products.stream().map(RoutineProductResponse::from).toList();
    }
}
