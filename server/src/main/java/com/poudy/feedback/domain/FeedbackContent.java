package com.poudy.feedback.domain;

public record FeedbackContent(String value) {

    public static final int MIN_LENGTH = 10;
    public static final int MAX_LENGTH = 2000;

    public FeedbackContent {
        if (value == null || meaningfulLengthOf(value) < MIN_LENGTH || value.length() > MAX_LENGTH) {
            throw new InvalidFeedbackException("의견 내용은 공백을 제외하고 10자 이상 2,000자 이하여야 합니다.");
        }
    }

    private static long meaningfulLengthOf(String value) {
        return value.codePoints().filter(codePoint -> !Character.isWhitespace(codePoint)).count();
    }
}
