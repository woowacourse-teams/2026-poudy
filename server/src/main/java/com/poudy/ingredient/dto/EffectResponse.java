package com.poudy.ingredient.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record EffectResponse(
        @NotNull @Schema(example = "1") Long id,
        @NotNull @Schema(example = "보습") String name,
        @NotNull @Schema(example = "#4CAF50") String color) {
}
