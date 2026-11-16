package com.poudy.security.auth.loadtest.controller.dto;

import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record LoadTestLoginRequest(@NotNull @Pattern(regexp = "[a-z0-9-]{1,40}") String name) {

    private static final String PREFIX = "loadtest-";
    private static final String EMAIL_DOMAIN = "@loadtest.poudy.invalid";

    public OAuthAccount account() {
        return new OAuthAccount(OAuthProvider.KAKAO, PREFIX + name, PREFIX + name + EMAIL_DOMAIN, true);
    }
}
