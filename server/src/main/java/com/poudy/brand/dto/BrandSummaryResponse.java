package com.poudy.brand.dto;

import jakarta.validation.constraints.NotNull;

public record BrandSummaryResponse(@NotNull Long id, @NotNull String name, @NotNull String logoUrl) {
}
