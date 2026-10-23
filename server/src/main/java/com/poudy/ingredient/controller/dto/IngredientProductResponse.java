package com.poudy.ingredient.controller.dto;

import com.poudy.brand.controller.dto.BrandResponse;
import com.poudy.ingredient.domain.IngredientProduct;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record IngredientProductResponse(
    @NotNull Long id,
    @NotNull String name,
    @NotNull BrandResponse brand,
    @NotNull String imageUrl,
    @NotNull Long price,
    @NotNull BigDecimal volumeValue,
    @NotNull String volumeUnit,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) Double moistureLevel,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) Double oilLevel) {

    public static IngredientProductResponse from(IngredientProduct product) {
        return new IngredientProductResponse(
            product.id(),
            product.name(),
            BrandResponse.from(product.brand()),
            product.imageUrl(),
            product.price(),
            product.volumeValue(),
            product.volumeUnit(),
            product.moistureLevel(),
            product.oilLevel()
        );
    }
}
