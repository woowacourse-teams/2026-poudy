package com.poudy.security.domain;

import java.util.Locale;
import java.util.Map;

public final class OAuthAccount {

    private final OAuthProvider provider;
    private final String providerId;
    private final String email;
    private final boolean emailVerified;

    public OAuthAccount(OAuthProvider provider, String providerId, String email, boolean emailVerified) {
        if (providerId == null || providerId.isBlank()) {
            throw new IllegalArgumentException("소셜 계정 식별자가 필요합니다.");
        }
        this.provider = provider;
        this.providerId = providerId;
        this.email = email;
        this.emailVerified = emailVerified;
    }

    public static OAuthAccount from(String registrationId, Map<String, Object> attributes) {
        return OAuthProvider.from(registrationId).parseAccount(attributes);
    }

    public String verifiedEmail() {
        if (!emailVerified || email == null || email.isBlank()) {
            throw new UnverifiedOAuthEmailException();
        }
        return email.strip().toLowerCase(Locale.ROOT);
    }

    public OAuthProvider provider() {
        return provider;
    }

    public String providerId() {
        return providerId;
    }
}
