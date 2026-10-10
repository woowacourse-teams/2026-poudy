package com.poudy.member.domain;

import com.poudy.security.domain.SignInStatus;

public enum MemberStatus {
    ACTIVE(SignInStatus.SIGNED_IN),
    WITHDRAWN(SignInStatus.WITHDRAWN),
    RESTORE_REQUESTED(SignInStatus.RESTORE_REQUESTED);

    private final SignInStatus signInStatus;

    MemberStatus(SignInStatus signInStatus) {
        this.signInStatus = signInStatus;
    }

    public SignInStatus signInStatus() {
        return signInStatus;
    }
}
