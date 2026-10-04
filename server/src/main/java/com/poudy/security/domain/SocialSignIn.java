package com.poudy.security.domain;

public interface SocialSignIn {

    SocialSignInResult signIn(OAuthAccount account);

    void requestRestore(long withdrawnMemberId);
}
