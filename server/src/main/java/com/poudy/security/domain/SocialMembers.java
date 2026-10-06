package com.poudy.security.domain;

public interface SocialMembers {

    SocialLoginResult login(OAuthAccount account);

    void requestRestore(long withdrawnMemberId);
}
