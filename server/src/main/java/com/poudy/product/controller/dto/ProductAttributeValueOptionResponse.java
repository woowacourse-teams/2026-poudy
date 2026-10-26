package com.poudy.product.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ProductAttributeValueOptionResponse(
    @NotNull @Schema(description = "속성값 코드", example = "MINERAL") String valueCode,
    @NotNull @Schema(description = "속성값 표시명", example = "무기자차") String name,
    @NotNull @Min(0) @Schema(description = "이 속성의 조건만 제외한 후보 중 해당 값을 가진 제품 수", example = "12") Long productCount) {
}
