package com.poudy.pushtoken.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PushTokenRequest(
    @NotNull(message = "INVALID_REQUEST_BODY") @Size(max = PushTokenRequest.TOKEN_MAX_LENGTH, message = "INVALID_REQUEST_BODY") @Pattern(regexp = PushTokenRequest.TOKEN_PATTERN, message = "INVALID_REQUEST_BODY") @Schema(example = PushTokenRequest.TOKEN_EXAMPLE, maxLength = PushTokenRequest.TOKEN_MAX_LENGTH) String token) {

    public static final int TOKEN_MAX_LENGTH = 255;
    public static final String TOKEN_PATTERN = "^Expo(nent)?PushToken\\[[A-Za-z0-9_-]+\\]$";
    public static final String TOKEN_EXAMPLE = "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]";
}
