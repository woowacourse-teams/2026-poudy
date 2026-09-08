package com.poudy.curation.controller.dto;

import com.poudy.product.domain.Product;
import com.poudy.product.domain.ProductVariant;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record CurationProductResponse(
    @NotNull @Schema(description = "제품 ID", example = "101") Long id,
    @NotNull @Schema(description = "제품명", example = "제품명") String name,
    @NotNull @Schema(description = "브랜드명", example = "브랜드명") String brandName,
    @NotNull @Schema(description = "제품 대표 이미지 URL", example = "https://cdn.example.com/products/101.png") String imageUrl,
    @NotNull @Schema(description = "제품 가격 (원)", example = "18000") Long price,
    @NotNull @Schema(description = "제품 용량 값", example = "200") BigDecimal volumeValue,
    @NotNull @Schema(description = "제품 용량 단위", example = "ml") String volumeUnit,
    @NotNull @Min(0) @Max(3) @Schema(description = "수분감 단계 (0~3)", example = "3") Integer moistureLevel,
    @NotNull @Min(0) @Max(3) @Schema(description = "유분감 단계 (0~3)", example = "1") Integer oilLevel) {

    public static CurationProductResponse from(Product product) {
        ProductVariant variant = product.representativeVariant();

        return new CurationProductResponse(
            product.id(),
            product.name(),
            product.brand().koreanName(),
            product.imageUrl(),
            variant.price(),
            variant.volumeValue(),
            variant.volumeUnit(),
            product.moistureLevel(),
            product.oilLevel()
        );
    }
}
