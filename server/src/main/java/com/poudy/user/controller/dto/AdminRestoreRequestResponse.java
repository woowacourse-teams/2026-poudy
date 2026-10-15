package com.poudy.user.controller.dto;

import com.poudy.security.domain.OAuthProvider;
import com.poudy.user.domain.RestoreRequest;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;

public record AdminRestoreRequestResponse(
    @NotNull Long userId,
    @NotNull OAuthProvider provider,
    @NotNull String email,
    @NotNull OffsetDateTime withdrawnAt,
    @NotNull OffsetDateTime requestedAt) {

    public static AdminRestoreRequestResponse from(RestoreRequest request) {
        return new AdminRestoreRequestResponse(
            request.userId(),
            request.provider(),
            request.email(),
            request.withdrawnAt(),
            request.requestedAt()
        );
    }
}
