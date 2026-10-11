package com.poudy.security.auth.app;

import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;

public interface ProviderTokenVerifier {

    OAuthProvider provider();

    OAuthAccount verify(String token);
}
