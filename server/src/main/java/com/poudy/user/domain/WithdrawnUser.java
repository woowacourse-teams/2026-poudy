package com.poudy.user.domain;

import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.domain.WithdrawnAccount;
import java.time.Duration;
import java.time.OffsetDateTime;

public final class WithdrawnUser {

    private final OAuthProvider provider;
    private final String email;
    private final OffsetDateTime withdrawnAt;

    public WithdrawnUser(OAuthProvider provider, String email, OffsetDateTime withdrawnAt) {
        this.provider = provider;
        this.email = email;
        this.withdrawnAt = withdrawnAt;
    }

    public WithdrawnAccount keptFor(Duration retention) {
        return new WithdrawnAccount(provider, email, withdrawnAt, withdrawnAt.plus(retention));
    }
}
