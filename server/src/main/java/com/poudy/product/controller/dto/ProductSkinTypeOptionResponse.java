package com.poudy.product.controller.dto;

import com.poudy.skintype.domain.SkinType;
import com.poudy.skintype.domain.SkinTypeProductCount;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record ProductSkinTypeOptionResponse(
    @NotNull SkinType code,
    @NotNull String name,
    @NotNull @Schema(description = "피부 타입과 민감성 조건을 모두 제외한 제품 수. 선택한 타입은 0개여도 포함한다") Long productCount) {

    public static ProductSkinTypeOptionResponse from(SkinTypeProductCount option) {
        return new ProductSkinTypeOptionResponse(
            option.skinType(),
            option.displayName(),
            option.productCount()
        );
    }
}
