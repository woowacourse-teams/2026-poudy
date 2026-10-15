package com.poudy.product.controller.dto;

import com.poudy.brand.controller.dto.BrandResponse;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.ProductVariant;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record ProductResponse(
    @NotNull @Schema(description = "제품 ID", example = "101") Long id,
    @NotNull @Schema(description = "제품명", example = "스킨케어 이름") String name,
    @NotNull @Schema(description = "브랜드 정보") BrandResponse brand,
    @NotNull @Schema(description = "제품 대표 이미지 URL", example = "https://cdn.example.com/products/101.png") String imageUrl,
    @NotNull @Schema(description = "제품 가격 (원)", example = "18000") Long price,
    @NotNull @Schema(description = "제품 용량 값", example = "200") BigDecimal volumeValue,
    @NotNull @Schema(description = "제품 용량 단위", example = "ml") String volumeUnit,
    @NotNull @DecimalMin("0") @DecimalMax("3") @Schema(description = "수분감 단계 (0~3, 0.5 단위)", example = "2.5", multipleOf = 0.5) Double moistureLevel,
    @NotNull @DecimalMin("0") @DecimalMax("3") @Schema(description = "유분감 단계 (0~3, 0.5 단위)", example = "1", multipleOf = 0.5) Double oilLevel,
    @NotNull @Schema(example = "false") Boolean sensitiveSkin,
    @NotNull @Schema(example = "2026-08-01T09:30:00+09:00") OffsetDateTime updatedAt) {

    public static ProductResponse from(Product product) {
        ProductVariant variant = product.representativeVariant();

        return new ProductResponse(
            product.id(),
            product.name(),
            BrandResponse.from(product.brand()),
            product.imageUrl(),
            variant.price(),
            variant.volumeValue(),
            variant.volumeUnit(),
            product.moistureLevel(),
            product.oilLevel(),
            product.isForSensitiveSkin(),
            product.updatedAt()
        );
    }

}
