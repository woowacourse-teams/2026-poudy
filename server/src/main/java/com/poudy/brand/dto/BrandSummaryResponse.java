package com.poudy.brand.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record BrandSummaryResponse(
        @NotNull @Schema(example = "12") Long id,
        @NotNull @Schema(example = "브랜드 이름") String name,
        @NotNull @Schema(example = "https://cdn.example.com/brands/12/logo.png") String logoUrl) {
}
