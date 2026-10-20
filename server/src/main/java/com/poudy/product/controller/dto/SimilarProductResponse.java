package com.poudy.product.controller.dto;

import com.poudy.brand.controller.dto.BrandResponse;
import com.poudy.excludecode.domain.ExcludeCodes;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.ProductVariant;
import com.poudy.product.domain.SimilarProduct;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;

public record SimilarProductResponse(
    @NotNull @Schema(description = "대상 제품 ID", example = "101") Long id,
    @NotNull @Schema(description = "대상 제품명") String name,
    @NotNull BrandResponse brand,
    @NotNull @Schema(description = "제품 배지, 없으면 빈 배열") List<BadgeResponse> badges,
    @NotNull String imageUrl,
    @NotNull @Schema(example = "18000") Long price,
    @NotNull @Schema(example = "200") BigDecimal volumeValue,
    @NotNull @Schema(example = "ml") String volumeUnit,
    @NotNull @Schema(example = "-2000") Long priceDifference,
    @DecimalMin("0") @DecimalMax("3") @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED, example = "2.5", multipleOf = 0.5) Double moistureLevel,
    @DecimalMin("0") @DecimalMax("3") @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED, example = "1", multipleOf = 0.5) Double oilLevel,
    @NotNull @Schema(description = "유사도 계산에 사용된 대상 구성품 ID", example = "473") Long partId,
    @NotNull @Schema(description = "대상 구성품에 빠른 제외 성분군 6종 중 하나라도 포함되어 있는지") Boolean containsExcludedIngredient) {
    public static SimilarProductResponse from(SimilarProduct item, Product source, ExcludeCodes excludeCodes) {
        Product product = item.product();
        ProductVariant variant = product.representativeVariant();
        return new SimilarProductResponse(
            product.id(),
            product.name(),
            BrandResponse.from(product.brand()),
            BadgeResponse.from(product.badges()),
            product.imageUrl(),
            variant.price(),
            variant.volumeValue(),
            variant.volumeUnit(),
            product.priceDifferenceFrom(source),
            product.moistureLevel(),
            product.oilLevel(),
            item.part().id(),
            item.containsExcludedIngredient(excludeCodes)
        );
    }
}
