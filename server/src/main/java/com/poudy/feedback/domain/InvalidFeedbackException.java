package com.poudy.feedback.domain;

public class InvalidFeedbackException extends IllegalArgumentException {

    public InvalidFeedbackException(String message) {
        super(message);
    }
}
