package com.poudy.image.domain;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.RuleViolationException;

public class InvalidImageException extends RuleViolationException {

    public InvalidImageException(String message) {
        super(ErrorCode.INVALID_FEEDBACK_IMAGE, message);
    }

    public InvalidImageException(String message, Throwable cause) {
        super(ErrorCode.INVALID_FEEDBACK_IMAGE, message, cause);
    }
}
