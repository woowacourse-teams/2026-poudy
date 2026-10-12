package com.poudy.security.auth.controller.dto;

import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.domain.RegisteredAccount;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record RegisteredAccountResponse(
    @NotNull @Schema(example = "KAKAO") OAuthProvider provider,
    @NotNull @Schema(example = "member@example.com") String email) {

    public static RegisteredAccountResponse from(RegisteredAccount account) {
        return new RegisteredAccountResponse(account.provider(), account.email());
    }
}
