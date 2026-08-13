package com.poudy.product.dto;

import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record BenefitResponse(
        @NotNull @Schema(example = "1") Long id,
        @NotNull @Schema(example = "보습") String name,
        @NotNull @Schema(example = "#4CAF50") String color,
        @NotNull @ArraySchema(schema = @Schema(example = "1005")) List<Long> ingredientIds) {
}
