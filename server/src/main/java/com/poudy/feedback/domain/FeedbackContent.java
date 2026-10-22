package com.poudy.feedback.domain;

public final class FeedbackContent {

    public static final int MIN_LENGTH = 10;
    public static final int MAX_LENGTH = 2000;

    private final String value;

    public FeedbackContent(String value) {
        String content = value == null ? "" : value.trim();
        if (content.length() < MIN_LENGTH || content.length() > MAX_LENGTH) {
            throw new InvalidFeedbackException("의견 내용은 앞뒤 공백을 제외하고 10자 이상 2,000자 이하여야 합니다.");
        }
        this.value = content;
    }

    public String value() {
        return value;
    }

    @Override
    public boolean equals(Object other) {
        return this == other || other instanceof FeedbackContent that && value.equals(that.value);
    }

    @Override
    public int hashCode() {
        return value.hashCode();
    }
}
