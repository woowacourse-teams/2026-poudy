package com.poudy.security.domain;

import java.util.Optional;

public interface SocialSignIn {

    Optional<SocialSignInResult> signIn(OAuthAccount account);

    long signUp(OAuthAccount account);

    void requestRestore(long withdrawnMemberId);
}
