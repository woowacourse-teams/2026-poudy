package com.poudy.security.login.app;

import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.login.LoginCredential;
import com.poudy.security.session.LoginChannel;

public record AppLoginCredential(OAuthProvider provider, String value) implements LoginCredential {

    @Override
    public LoginChannel channel() {
        return LoginChannel.APP;
    }
}
