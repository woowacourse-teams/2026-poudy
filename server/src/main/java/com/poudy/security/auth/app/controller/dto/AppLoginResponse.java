package com.poudy.security.auth.app.controller.dto;

import com.poudy.security.domain.LoginStatus;
import jakarta.validation.constraints.NotNull;

public record AppLoginResponse(@NotNull LoginStatus status) {
}
