package com.poudy.feedback.domain;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.RuleViolationException;

public class InvalidFeedbackException extends RuleViolationException {

    public InvalidFeedbackException(String message) {
        super(ErrorCode.INVALID_REQUEST_BODY, message);
    }
}
