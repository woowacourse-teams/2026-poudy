package com.poudy.brand.controller.dto;

import com.poudy.brand.domain.Brand;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.Objects;

public record BrandResponse(
        @NotNull @Schema(description = "브랜드 ID", example = "12") Long id,
        @NotNull @Schema(description = "브랜드 한글명", example = "브랜드 이름") String name,
        @NotNull @Schema(description = "브랜드 영문명", example = "BRAND NAME") String englishName,
        @NotNull @Schema(description = "브랜드 이미지 URL", example = "https://cdn.example.com/brands/12/image.png") String imageUrl) {

    public static BrandResponse from(Brand brand) {
        return new BrandResponse(
                brand.id(),
                brand.koreanName(),
                Objects.requireNonNullElse(brand.englishName(), ""),
                Objects.requireNonNullElse(brand.imageUrl(), ""));
    }

}
