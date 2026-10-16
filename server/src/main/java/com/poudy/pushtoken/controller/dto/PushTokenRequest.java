package com.poudy.pushtoken.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PushTokenRequest(
    @NotNull(message = "INVALID_REQUEST_BODY") @Size(max = 255, message = "INVALID_REQUEST_BODY") @Pattern(regexp = "^Expo(nent)?PushToken\\[[A-Za-z0-9_-]+\\]$", message = "INVALID_REQUEST_BODY") @Schema(example = "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]", maxLength = 255) String token) {
}
