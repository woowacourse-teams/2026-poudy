package com.poudy.user.domain;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.RuleViolationException;

public class InvalidNicknameException extends RuleViolationException {

    public InvalidNicknameException(ErrorCode code) {
        super(code, code.message());
    }
}
