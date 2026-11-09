package com.poudy.product.controller.dto;

import com.poudy.skintype.domain.SkinOptions;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record ProductSensitiveSkinOptionResponse(
    @NotNull String name,
    @NotNull @Schema(description = "피부 타입과 민감성 조건을 모두 제외한 민감성 제품 수. 선택한 민감성은 0개여도 포함한다") Long productCount) {

    public static ProductSensitiveSkinOptionResponse from(Long count) {
        if (count == null) {
            return null;
        }
        return new ProductSensitiveSkinOptionResponse(SkinOptions.sensitiveSkinName(), count);
    }
}
