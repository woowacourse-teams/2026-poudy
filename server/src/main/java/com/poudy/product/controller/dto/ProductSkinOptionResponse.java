package com.poudy.product.controller.dto;

import com.poudy.skintype.domain.SkinChoice;
import com.poudy.skintype.domain.SkinOptionProductCount;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record ProductSkinOptionResponse(
    @NotNull SkinChoice code,
    @NotNull String name,
    @NotNull @Schema(description = "피부 타입과 민감성 조건을 모두 제외한 제품 수. 선택한 항목은 0개여도 포함한다") Long productCount) {

    public static ProductSkinOptionResponse from(SkinOptionProductCount option) {
        return new ProductSkinOptionResponse(option.choice(), option.displayName(), option.productCount());
    }
}
