package com.poudy.product.dto;

import com.poudy.brand.dto.BrandSummaryResponse;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record ProductResponse(@NotNull Long id, @NotNull String name, @NotNull BrandSummaryResponse brand,
        @NotNull String imageUrl, @NotNull Long price, @NotNull BigDecimal volumeValue, @NotNull String volumeUnit) {
}
