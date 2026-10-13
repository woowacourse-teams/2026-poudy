package com.poudy.member.domain;

import com.poudy.security.domain.LoginStatus;

public enum MemberStatus {
    ACTIVE(LoginStatus.SIGNED_IN),
    WITHDRAWN(LoginStatus.WITHDRAWN),
    RESTORE_REQUESTED(LoginStatus.RESTORE_REQUESTED);

    private final LoginStatus loginStatus;

    MemberStatus(LoginStatus loginStatus) {
        this.loginStatus = loginStatus;
    }

    public LoginStatus loginStatus() {
        return loginStatus;
    }
}
