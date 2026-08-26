package com.poudy.feedback.domain;

import java.util.Objects;
import java.util.UUID;

public record FeedbackImage(UUID id, FeedbackImageFormat format) {

    public FeedbackImage {
        Objects.requireNonNull(id, "이미지 ID가 필요합니다.");
        Objects.requireNonNull(format, "이미지 형식이 필요합니다.");
    }

    public static FeedbackImage create(FeedbackImageFormat format) {
        return new FeedbackImage(UUID.randomUUID(), format);
    }
}
