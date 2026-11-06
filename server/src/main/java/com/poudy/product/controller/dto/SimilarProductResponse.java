package com.poudy.product.controller.dto;

import com.poudy.brand.controller.dto.BrandResponse;
import com.poudy.excludecode.domain.ExcludeCodes;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.ProductVariant;
import com.poudy.product.domain.SimilarProduct;
import com.poudy.product.domain.UnitPrice;
import com.poudy.product.domain.UnitPriceComparison;
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
    @NotNull @Schema(description = "제품 표식, 없으면 빈 배열") List<MarkResponse> marks,
    @NotNull String imageUrl,
    @NotNull @Schema(example = "18000") Long price,
    @NotNull @Schema(example = "200") BigDecimal volumeValue,
    @NotNull @Schema(example = "ml") String volumeUnit,
    @NotNull @Schema(example = "-2000") Long priceDifference,
    @DecimalMin("0") @DecimalMax("3") @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED, example = "2.5", multipleOf = 0.5) Double moistureLevel,
    @DecimalMin("0") @DecimalMax("3") @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED, example = "1", multipleOf = 0.5) Double oilLevel,
    @NotNull @Schema(description = "유사도 계산에 사용된 대상 구성품 ID", example = "473") Long partId,
    @NotNull @Schema(description = "대상 구성품에 빠른 제외 성분군 6종 중 하나라도 포함되어 있는지") Boolean containsExcludedIngredient,
    @Schema(description = "대표 옵션의 단위당 가격. 정수 반올림, 용량 0이면 null", nullable = true, requiredMode = Schema.RequiredMode.NOT_REQUIRED, example = "460") BigDecimal unitPrice,
    @Schema(description = "기준 단위 가격 대비 차이 비율(%). 음수는 저렴, 소수 둘째 자리 반올림. 비교 불가나 기준 가격 0이면 null", nullable = true, requiredMode = Schema.RequiredMode.NOT_REQUIRED, example = "-54") BigDecimal unitPriceDifferencePercent,
    @Schema(description = "반올림 전 단위 가격 비교. 단위가 다르거나 용량 0이면 UNAVAILABLE", requiredMode = Schema.RequiredMode.NOT_REQUIRED) UnitPriceComparison unitPriceComparison) {
    public static SimilarProductResponse from(SimilarProduct item, Product source, ExcludeCodes excludeCodes) {
        Product product = item.product();
        ProductVariant variant = product.representativeVariant();
        UnitPrice unitPrice = variant.unitPrice();
        UnitPrice base = source.representativeVariant().unitPrice();
        return new SimilarProductResponse(
            product.id(),
            product.name(),
            BrandResponse.from(product.brand()),
            MarkResponse.forList(product.marks()),
            product.imageUrl(),
            variant.price(),
            variant.volumeValue(),
            variant.volumeUnit(),
            product.priceDifferenceFrom(source),
            product.moistureLevel(),
            product.oilLevel(),
            item.part().id(),
            item.containsExcludedIngredient(excludeCodes),
            unitPrice.roundedAmount(),
            unitPrice.differencePercentFrom(base),
            unitPrice.comparisonWith(base)
        );
    }
}
