package com.poudy.security.auth.controller.dto;

import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.domain.WithdrawnAccount;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;

public record WithdrawnAccountResponse(
    @NotNull @Schema(example = "KAKAO") OAuthProvider provider,
    @NotNull @Schema(example = "member@example.com") String email,
    @NotNull @Schema(example = "2026-10-05T14:00:00+09:00") OffsetDateTime withdrawnAt,
    @NotNull @Schema(example = "2026-11-04T14:00:00+09:00") OffsetDateTime restorableUntil) {

    public static WithdrawnAccountResponse from(WithdrawnAccount account) {
        return new WithdrawnAccountResponse(
            account.provider(),
            account.email(),
            account.withdrawnAt(),
            account.restorableUntil()
        );
    }
}
