package com.poudy.security.domain;

import java.util.Optional;

public interface SocialUsers {

    Optional<SocialLoginResult> login(OAuthAccount account);

    long signUp(OAuthAccount account);

    WithdrawnAccount findWithdrawn(long withdrawnUserId);

    void requestRestore(long withdrawnUserId);
}
