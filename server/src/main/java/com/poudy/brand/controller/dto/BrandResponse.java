package com.poudy.brand.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record BrandResponse(
        @NotNull @Schema(description = "브랜드 ID", example = "12") Long id,
        @NotNull @Schema(description = "브랜드 한글명", example = "브랜드 이름") String name,
        @NotNull @Schema(description = "브랜드 영문명", example = "BRAND NAME") String englishName,
        @NotNull @Schema(description = "브랜드 이미지 URL", example = "https://cdn.example.com/brands/12/image.png") String imageUrl) {

    static final Long SAMPLE_ID = 12L;
    static final String SAMPLE_NAME = "브랜드 이름";
    static final String SAMPLE_ENGLISH_NAME = "BRAND NAME";

    public static BrandResponse sample() {
        return new BrandResponse(SAMPLE_ID, SAMPLE_NAME, SAMPLE_ENGLISH_NAME, sampleImageUrl(SAMPLE_ID));
    }

    static String sampleImageUrl(Long id) {
        return "https://cdn.example.com/brands/" + id + "/image.png";
    }
}
