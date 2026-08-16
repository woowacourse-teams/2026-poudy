package com.poudy.category.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record CategoryChildResponse(
        @NotNull @Schema(example = "2") Long id,
        @NotNull @Schema(example = "스킨/토너") String name,
        @NotNull @Schema(example = "30") Long productCount) {
}
