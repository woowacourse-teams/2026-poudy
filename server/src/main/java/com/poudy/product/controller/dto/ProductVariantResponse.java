package com.poudy.product.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record ProductVariantResponse(
        @NotNull @Schema(description = "용량 옵션 ID", example = "1") Long id,
        @NotNull @Schema(description = "가격 (원)", example = "18000") Long price,
        @NotNull @Schema(description = "용량 값", example = "150") BigDecimal volumeValue,
        @NotNull @Schema(description = "용량 단위", example = "ml") String volumeUnit,
        @NotNull @Schema(description = "판매 상태", example = "active") String status) {
}
