package com.poudy.security.domain;

import java.util.Optional;

public interface SocialMembers {

    Optional<SocialLoginResult> login(OAuthAccount account);

    long signUp(OAuthAccount account);

    void requestRestore(long withdrawnMemberId);
}
