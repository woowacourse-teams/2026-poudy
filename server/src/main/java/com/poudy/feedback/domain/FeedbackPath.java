package com.poudy.feedback.domain;

public record FeedbackPath(String value) {

    public static final int MAX_LENGTH = 500;

    public FeedbackPath {
        if (value == null || value.isBlank() || value.length() > MAX_LENGTH) {
            throw new InvalidFeedbackException("의견 작성 화면 경로는 500자 이하여야 합니다.");
        }
    }
}
