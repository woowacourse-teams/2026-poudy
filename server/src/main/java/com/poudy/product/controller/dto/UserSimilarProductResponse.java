package com.poudy.product.controller.dto;

import com.poudy.product.domain.MyFilteredSimilarProduct;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record UserSimilarProductResponse(
    @NotNull @Schema(example = "101") Long id,
    @NotNull @Schema(example = "false") Boolean containsMyFilterIngredient) {

    public static List<UserSimilarProductResponse> from(List<MyFilteredSimilarProduct> products) {
        return products.stream()
            .map(product -> new UserSimilarProductResponse(product.productId(), product.containsMyFilterIngredient()))
            .toList();
    }
}
