package com.poudy.feedback.domain;

import java.util.Objects;
import java.util.Optional;

public final class FeedbackPath {

    public static final int MAX_LENGTH = 500;

    private static final FeedbackPath UNKNOWN = new FeedbackPath();

    private final String value;

    private FeedbackPath() {
        this.value = null;
    }

    public FeedbackPath(String value) {
        if (value == null || value.isBlank() || value.length() > MAX_LENGTH) {
            throw new InvalidFeedbackException("의견 작성 화면 경로는 500자 이하여야 합니다.");
        }
        this.value = value;
    }

    public static FeedbackPath from(String value) {
        if (value == null) {
            return UNKNOWN;
        }

        return new FeedbackPath(value);
    }

    public Optional<String> value() {
        return Optional.ofNullable(value);
    }

    @Override
    public boolean equals(Object other) {
        return this == other || other instanceof FeedbackPath that && Objects.equals(value, that.value);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(value);
    }
}
