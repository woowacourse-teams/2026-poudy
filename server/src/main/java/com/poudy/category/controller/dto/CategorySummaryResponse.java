package com.poudy.category.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record CategorySummaryResponse(
        @NotNull @Schema(example = "1") Long id,
        @NotNull @Schema(example = "스킨케어") String name) {
}
