package com.poudy.product.controller.dto;

import com.poudy.brand.controller.dto.BrandResponse;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.ProductCard;
import com.poudy.product.domain.ProductVariant;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record ProductResponse(
    @NotNull @Schema(description = "제품 ID", example = "101") Long id,
    @NotNull @Schema(description = "제품명", example = "스킨케어 이름") String name,
    @NotNull @Schema(description = "브랜드 정보") BrandResponse brand,
    @NotNull @Schema(description = "제품 배지, 없으면 빈 배열") List<BadgeResponse> badges,
    @NotNull @Schema(description = "제품 대표 이미지 URL", example = "https://cdn.example.com/products/101.png") String imageUrl,
    @NotNull @Schema(description = "제품 가격 (원)", example = "18000") Long price,
    @NotNull @Schema(description = "제품 용량 값", example = "200") BigDecimal volumeValue,
    @NotNull @Schema(description = "제품 용량 단위", example = "ml") String volumeUnit,
    @DecimalMin("0") @DecimalMax("3") @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED, description = "수분감 단계 (0~3, 0.5 단위)", example = "2.5", multipleOf = 0.5) Double moistureLevel,
    @DecimalMin("0") @DecimalMax("3") @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED, description = "유분감 단계 (0~3, 0.5 단위)", example = "1", multipleOf = 0.5) Double oilLevel,
    @NotNull @Schema(example = "false") Boolean sensitiveSkin,
    @NotNull @Schema(example = "2026-08-01T09:30:00+09:00") OffsetDateTime updatedAt) {

    public static ProductResponse from(Product product) {
        ProductVariant variant = product.representativeVariant();

        return new ProductResponse(
            product.id(),
            product.name(),
            BrandResponse.from(product.brand()),
            BadgeResponse.from(product.badges()),
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

    public static ProductResponse from(ProductCard card) {
        return new ProductResponse(
            card.id(),
            card.name(),
            BrandResponse.from(card.brand()),
            BadgeResponse.from(card.badges()),
            card.imageUrl(),
            card.price(),
            card.volumeValue(),
            card.volumeUnit(),
            card.moistureLevel(),
            card.oilLevel(),
            card.sensitiveSkin(),
            card.updatedAt()
        );
    }

}
