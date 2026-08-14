package com.poudy.brand.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record BrandResponse(
        @NotNull @Schema(description = "브랜드 ID", example = "12") Long id,
        @NotNull @Schema(description = "브랜드 한글명", example = "라운드랩") String name,
        @NotNull @Schema(description = "브랜드 영문명", example = "ROUND LAB") String englishName,
        @NotNull @Schema(description = "브랜드 로고 URL", example = "https://cdn.example.com/brands/12/logo.png") String logoUrl,
        @NotNull @Schema(description = "브랜드에 등록된 제품 개수", example = "48") Long productCount) {
}
