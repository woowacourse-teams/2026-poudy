package com.poudy.security.domain;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.RuleViolationException;

public class UnverifiedOAuthEmailException extends RuleViolationException {

    public UnverifiedOAuthEmailException() {
        super(ErrorCode.OAUTH_EMAIL_NOT_VERIFIED, ErrorCode.OAUTH_EMAIL_NOT_VERIFIED.message());
    }
}
