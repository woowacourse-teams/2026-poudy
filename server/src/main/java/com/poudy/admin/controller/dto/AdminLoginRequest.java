package com.poudy.admin.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record AdminLoginRequest(
    @NotBlank(message = "INVALID_REQUEST_BODY") @Pattern(regexp = ".*\\S.*", flags = Pattern.Flag.DOTALL, message = "INVALID_REQUEST_BODY") @Schema(description = "관리자 아이디", example = "admin") String username,
    @NotBlank(message = "INVALID_REQUEST_BODY") @Pattern(regexp = ".*\\S.*", flags = Pattern.Flag.DOTALL, message = "INVALID_REQUEST_BODY") @Schema(description = "관리자 비밀번호", format = "password", example = "password") String password) {
}
