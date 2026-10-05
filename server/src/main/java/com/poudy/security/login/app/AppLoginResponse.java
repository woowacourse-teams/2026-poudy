package com.poudy.security.login.app;

import com.poudy.security.domain.LoginStatus;
import jakarta.validation.constraints.NotNull;

public record AppLoginResponse(@NotNull LoginStatus status) {
}
