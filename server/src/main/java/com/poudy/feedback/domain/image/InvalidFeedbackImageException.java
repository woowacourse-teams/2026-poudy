package com.poudy.feedback.domain.image;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.RuleViolationException;

public class InvalidFeedbackImageException extends RuleViolationException {

    public InvalidFeedbackImageException(String message) {
        super(ErrorCode.INVALID_FEEDBACK_IMAGE, message);
    }

    public InvalidFeedbackImageException(String message, Throwable cause) {
        super(ErrorCode.INVALID_FEEDBACK_IMAGE, message, cause);
    }
}
