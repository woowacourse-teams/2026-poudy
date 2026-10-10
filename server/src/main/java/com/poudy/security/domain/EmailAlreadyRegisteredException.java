package com.poudy.security.domain;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.RuleViolationException;

public class EmailAlreadyRegisteredException extends RuleViolationException {

    private final OAuthProvider registeredProvider;

    public EmailAlreadyRegisteredException(OAuthProvider registeredProvider) {
        super(ErrorCode.MEMBER_EMAIL_ALREADY_REGISTERED, ErrorCode.MEMBER_EMAIL_ALREADY_REGISTERED.message());
        this.registeredProvider = registeredProvider;
    }

    public OAuthProvider registeredProvider() {
        return registeredProvider;
    }
}
