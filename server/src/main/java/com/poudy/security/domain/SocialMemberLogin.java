package com.poudy.security.domain;

public interface SocialMemberLogin {

    SocialLoginResult login(OAuthAccount account);

    void requestRestore(long withdrawnMemberId);
}
