package com.poudy.member.controller.dto;

import com.poudy.member.domain.RestoreRequest;
import com.poudy.security.domain.OAuthProvider;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;

public record AdminRestoreRequestResponse(
    @NotNull Long memberId,
    @NotNull OAuthProvider provider,
    @NotNull String email,
    @NotNull OffsetDateTime withdrawnAt,
    @NotNull OffsetDateTime requestedAt) {

    public static AdminRestoreRequestResponse from(RestoreRequest request) {
        return new AdminRestoreRequestResponse(
            request.memberId(),
            request.provider(),
            request.email(),
            request.withdrawnAt(),
            request.requestedAt()
        );
    }
}
