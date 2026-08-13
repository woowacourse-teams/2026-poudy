package com.poudy.category.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record CategoryChildResponse(
        @NotNull @Schema(example = "7") Long id,
        @NotNull @Schema(example = "토너") String name,
        @NotNull @Schema(example = "30") Long productCount) {
}
