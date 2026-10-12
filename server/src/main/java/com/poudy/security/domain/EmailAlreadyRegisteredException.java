package com.poudy.security.domain;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.RuleViolationException;

public class EmailAlreadyRegisteredException extends RuleViolationException {

    private final RegisteredAccount registeredAccount;

    public EmailAlreadyRegisteredException(RegisteredAccount registeredAccount) {
        super(ErrorCode.MEMBER_EMAIL_ALREADY_REGISTERED, ErrorCode.MEMBER_EMAIL_ALREADY_REGISTERED.message());
        this.registeredAccount = registeredAccount;
    }

    public RegisteredAccount registeredAccount() {
        return registeredAccount;
    }
}
