package com.poudy.brand.controller.dto;

import com.poudy.category.controller.dto.CategoryResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record BrandDetailResponse(
        @NotNull @Schema(description = "브랜드 ID", example = "12") Long id,
        @NotNull @Schema(description = "브랜드 한글명", example = "브랜드 이름") String name,
        @NotNull @Schema(description = "브랜드 영문명", example = "BRAND NAME") String englishName,
        @NotNull @Schema(description = "브랜드 이미지 URL", example = "https://cdn.example.com/brands/12/image.png") String imageUrl,
        @NotNull @Schema(description = "이 브랜드 제품이 속한 카테고리를 대분류와 소분류로 표시한다. productCount 는 이 브랜드 안에서 센 값이다") List<CategoryResponse> categories) {

    public static BrandDetailResponse sample(Long id) {
        return new BrandDetailResponse(
                id,
                BrandResponse.SAMPLE_NAME,
                BrandResponse.SAMPLE_ENGLISH_NAME,
                BrandResponse.sampleImageUrl(id),
                CategoryResponse.samplesOfBrand());
    }
}
