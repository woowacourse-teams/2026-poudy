package com.poudy.brand.dto;

import jakarta.validation.constraints.NotNull;

public record BrandResponse(@NotNull Long id, @NotNull String name, @NotNull String logoUrl,
        @NotNull Long productCount) {
}
