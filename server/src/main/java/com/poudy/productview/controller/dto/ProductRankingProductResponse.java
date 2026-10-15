package com.poudy.productview.controller.dto;

import com.poudy.product.controller.dto.BadgeResponse;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.ProductVariant;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ProductRankingProductResponse(
    @NotNull @Schema(description = "제품 ID", example = "101") Long id,
    @NotNull @Schema(description = "제품명", example = "스킨케어 이름") String name,
    @NotNull @Schema(description = "브랜드명", example = "파우디") String brandName,
    @NotNull @Schema(description = "제품 배지, 없으면 빈 배열") List<BadgeResponse> badges,
    @NotNull @Schema(description = "제품 대표 이미지 URL", example = "https://cdn.example.com/products/101.png") String imageUrl,
    @NotNull @Schema(description = "대표 판매 옵션 가격 (원)", example = "18000") Long price,
    @NotNull @DecimalMin("0") @DecimalMax("3") @Schema(description = "수분감 단계 (0~3, 0.5 단위)", example = "2.5", multipleOf = 0.5) Double moistureLevel,
    @NotNull @DecimalMin("0") @DecimalMax("3") @Schema(description = "유분감 단계 (0~3, 0.5 단위)", example = "1", multipleOf = 0.5) Double oilLevel) {

    public static ProductRankingProductResponse from(Product product) {
        ProductVariant variant = product.representativeVariant();
        return new ProductRankingProductResponse(
            product.id(),
            product.name(),
            product.brand().koreanName(),
            BadgeResponse.from(product.badges()),
            product.imageUrl(),
            variant.price(),
            product.moistureLevel(),
            product.oilLevel()
        );
    }
}
