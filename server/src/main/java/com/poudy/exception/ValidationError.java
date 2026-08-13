package com.poudy.exception;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record ValidationError(
        @NotNull @Schema(example = "size") String field,
        @NotNull @Schema(example = "size 값이 올바르지 않습니다.") String message) {
}
