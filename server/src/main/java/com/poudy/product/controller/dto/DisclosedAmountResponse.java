package com.poudy.product.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record DisclosedAmountResponse(
        @NotNull @Schema(description = "공개 형태", example = "exact") String type,
        @NotNull @Schema(description = "함량 값", example = "10500") BigDecimal value,
        @NotNull @Schema(description = "함량 단위", example = "ppm") String unit) {

    public static DisclosedAmountResponse sample() {
        return new DisclosedAmountResponse("exact", new BigDecimal("10500"), "ppm");
    }
}
