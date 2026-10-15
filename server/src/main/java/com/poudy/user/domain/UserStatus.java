package com.poudy.user.domain;

import com.poudy.security.domain.LoginStatus;

public enum UserStatus {
    ACTIVE(LoginStatus.SIGNED_IN),
    WITHDRAWN(LoginStatus.WITHDRAWN),
    RESTORE_REQUESTED(LoginStatus.RESTORE_REQUESTED);

    private final LoginStatus loginStatus;

    UserStatus(LoginStatus loginStatus) {
        this.loginStatus = loginStatus;
    }

    public LoginStatus loginStatus() {
        return loginStatus;
    }
}
