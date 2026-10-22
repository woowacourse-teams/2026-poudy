package com.poudy.pushtoken.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PushTokenEnabledRequest(
    @NotNull(message = "INVALID_REQUEST_BODY") @Size(max = PushTokenRequest.TOKEN_MAX_LENGTH, message = "INVALID_REQUEST_BODY") @Pattern(regexp = PushTokenRequest.TOKEN_PATTERN, message = "INVALID_REQUEST_BODY") @Schema(example = PushTokenRequest.TOKEN_EXAMPLE, maxLength = PushTokenRequest.TOKEN_MAX_LENGTH) String token,
    @NotNull(message = "INVALID_REQUEST_BODY") @Schema(example = "false") Boolean enabled) {
}
