package com.poudy.product.controller.dto;

import com.poudy.brand.controller.dto.BrandResponse;
import com.poudy.excludecode.domain.ExcludeCodes;
import com.poudy.product.domain.SimilarProduct;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record SimilarProductResponse(
    @NotNull @Schema(description = "대상 제품 ID", example = "101") Long id,
    @NotNull @Schema(description = "대상 제품명") String name,
    @NotNull BrandResponse brand,
    @NotNull String imageUrl,
    @NotNull @Schema(description = "유사도 계산에 사용된 대상 구성품 ID", example = "473") Long partId,
    @NotNull @Schema(description = "대상 구성품에 빠른 제외 성분군 6종 중 하나라도 포함되어 있는지") Boolean containsExcludedIngredient) {
    public static SimilarProductResponse from(SimilarProduct item, ExcludeCodes excludeCodes) {
        return new SimilarProductResponse(
            item.product().id(),
            item.product().name(),
            BrandResponse.from(item.product().brand()),
            item.product().imageUrl(),
            item.part().id(),
            item.containsExcludedIngredient(excludeCodes)
        );
    }
}
