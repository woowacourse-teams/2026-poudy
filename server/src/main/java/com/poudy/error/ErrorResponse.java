package com.poudy.error;

import jakarta.validation.constraints.NotNull;

public record ErrorResponse(@NotNull ErrorCode code, @NotNull String message) {

    public static ErrorResponse of(ErrorCode code, String message) {
        return new ErrorResponse(code, message);
    }
}
