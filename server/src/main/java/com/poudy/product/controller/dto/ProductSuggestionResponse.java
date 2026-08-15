package com.poudy.product.controller.dto;

import com.poudy.brand.controller.dto.BrandResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record ProductSuggestionResponse(
        @NotNull @Schema(description = "제품 ID", example = "101") Long id,
        @NotNull @Schema(description = "제품명", example = "스킨케어 이름") String name,
        @NotNull @Schema(description = "제품 대표 이미지 URL", example = "https://cdn.example.com/products/101.png") String imageUrl,
        @NotNull @Schema(description = "브랜드 한글명", example = "브랜드 이름") String brandName) {

    public static ProductSuggestionResponse sample(Long id) {
        return new ProductSuggestionResponse(
                id,
                "스킨케어 이름",
                ProductResponse.sampleImageUrl(id),
                BrandResponse.sample().name());
    }
}
