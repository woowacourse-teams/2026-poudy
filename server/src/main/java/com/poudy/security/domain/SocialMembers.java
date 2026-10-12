package com.poudy.security.domain;

import java.util.Optional;

public interface SocialMembers {

    Optional<SocialLoginResult> login(OAuthAccount account);

    long signUp(OAuthAccount account);

    WithdrawnAccount findWithdrawn(long withdrawnMemberId);

    void requestRestore(long withdrawnMemberId);
}
