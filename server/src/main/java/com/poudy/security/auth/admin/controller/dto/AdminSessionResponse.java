package com.poudy.security.auth.admin.controller.dto;

import com.poudy.security.session.LoginAdmin;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record AdminSessionResponse(@NotNull @Schema(example = "admin") String username) {

    public static AdminSessionResponse from(LoginAdmin loginAdmin) {
        return new AdminSessionResponse(loginAdmin.username());
    }
}
