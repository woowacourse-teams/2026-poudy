package com.poudy.user.domain;

import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;

public final class UserSignup {

    private final OAuthProvider provider;
    private final String providerId;
    private final String email;

    private UserSignup(OAuthProvider provider, String providerId, String email) {
        this.provider = provider;
        this.providerId = providerId;
        this.email = email;
    }

    public static UserSignup from(OAuthAccount account) {
        return new UserSignup(account.provider(), account.providerId(), account.verifiedEmail());
    }

    public OAuthProvider provider() {
        return provider;
    }

    public String providerId() {
        return providerId;
    }

    public String email() {
        return email;
    }
}
