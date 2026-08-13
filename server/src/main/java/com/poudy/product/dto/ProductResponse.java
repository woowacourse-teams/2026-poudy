package com.poudy.product.dto;

import com.poudy.brand.dto.BrandSummaryResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record ProductResponse(
        @NotNull @Schema(example = "101") Long id,
        @NotNull @Schema(example = "스킨케어 이름") String name,
        @NotNull BrandSummaryResponse brand,
        @NotNull @Schema(example = "https://cdn.example.com/products/101.png") String imageUrl,
        @NotNull @Schema(example = "18000") Long price,
        @NotNull @Schema(example = "200") BigDecimal volumeValue,
        @NotNull @Schema(example = "ml") String volumeUnit) {
}
