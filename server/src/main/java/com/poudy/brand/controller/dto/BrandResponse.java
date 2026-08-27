package com.poudy.brand.controller.dto;

import com.poudy.brand.domain.Brand;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record BrandResponse(
    @NotNull @Schema(description = "브랜드 ID", example = "12") Long id,
    @NotNull @Schema(description = "브랜드 한글명", example = "브랜드 이름") String name,
    @Schema(description = "브랜드 영문명", example = "BRAND NAME", nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) String englishName,
    @Schema(description = "브랜드 이미지 URL", example = "https://cdn.example.com/brands/12/image.png", nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) String imageUrl) {

    public static BrandResponse from(Brand brand) {
        return new BrandResponse(
            brand.id(),
            brand.koreanName(),
            brand.englishName(),
            brand.imageUrl()
        );
    }

}
