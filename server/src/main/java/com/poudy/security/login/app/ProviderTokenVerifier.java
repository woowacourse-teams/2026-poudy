package com.poudy.security.login.app;

import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;

public interface ProviderTokenVerifier {

    OAuthProvider provider();

    OAuthAccount verify(String token);
}
