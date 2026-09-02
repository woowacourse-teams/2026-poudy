package com.poudy.feedback.domain;

public final class FeedbackPath {

    public static final int MAX_LENGTH = 500;

    private final String value;

    public FeedbackPath(String value) {
        if (value == null || value.isBlank() || value.length() > MAX_LENGTH) {
            throw new InvalidFeedbackException("의견 작성 화면 경로는 500자 이하여야 합니다.");
        }
        this.value = value;
    }

    public String value() {
        return value;
    }

    @Override
    public boolean equals(Object other) {
        return this == other || other instanceof FeedbackPath that && value.equals(that.value);
    }

    @Override
    public int hashCode() {
        return value.hashCode();
    }
}
