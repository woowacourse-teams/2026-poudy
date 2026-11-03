package com.poudy.product.controller.dto;

import com.poudy.product.domain.ProductVariant;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record ProductComparisonVariantResponse(
    @NotNull Long id,
    @NotNull @Schema(description = "이 용량 옵션의 가격(원)") Long price,
    @NotNull BigDecimal volumeValue,
    @NotNull String volumeUnit) {

    public static ProductComparisonVariantResponse from(ProductVariant variant) {
        return new ProductComparisonVariantResponse(
            variant.id(),
            variant.price(),
            variant.volumeValue(),
            variant.volumeUnit()
        );
    }
}
