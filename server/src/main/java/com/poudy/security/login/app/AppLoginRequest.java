package com.poudy.security.login.app;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

public record AppLoginRequest(
    @NotBlank(message = "INVALID_REQUEST_BODY") @Schema(description = "카카오 접근 토큰 또는 구글 ID 토큰") String token) {
}
