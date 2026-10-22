package com.poudy.product.controller.dto;

import com.poudy.product.domain.SkinFilteredSimilarProduct;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record UserSimilarProductResponse(
    @NotNull @Schema(example = "101") Long id,
    @NotNull @Schema(example = "false") Boolean containsSkinFilterIngredient) {

    public static List<UserSimilarProductResponse> from(List<SkinFilteredSimilarProduct> products) {
        return products.stream()
            .map(product -> new UserSimilarProductResponse(product.productId(), product.containsSkinFilterIngredient()))
            .toList();
    }
}
