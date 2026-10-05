package com.poudy.security.login;

import com.poudy.security.domain.OAuthAccount;

public interface SocialAccountReader<T extends LoginCredential> {

    OAuthAccount read(T credential);
}
