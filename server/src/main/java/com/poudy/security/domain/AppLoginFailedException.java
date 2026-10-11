package com.poudy.security.domain;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.RuleViolationException;

public class AppLoginFailedException extends RuleViolationException {

    public AppLoginFailedException() {
        super(ErrorCode.OAUTH_LOGIN_FAILED, ErrorCode.OAUTH_LOGIN_FAILED.message());
    }
}
