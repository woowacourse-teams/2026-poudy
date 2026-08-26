package com.poudy.feedback.domain;

public class InvalidFeedbackImageException extends IllegalArgumentException {

    public InvalidFeedbackImageException(String message) {
        super(message);
    }

    public InvalidFeedbackImageException(String message, Throwable cause) {
        super(message, cause);
    }
}
