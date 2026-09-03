package com.poudy.feedback.domain;

import java.util.Objects;
import java.util.UUID;

public final class FeedbackImage {

    private final UUID id;
    private final FeedbackImageFormat format;

    public FeedbackImage(UUID id, FeedbackImageFormat format) {
        this.id = Objects.requireNonNull(id, "이미지 ID가 필요합니다.");
        this.format = Objects.requireNonNull(format, "이미지 형식이 필요합니다.");
    }

    public static FeedbackImage create(FeedbackImageFormat format) {
        return new FeedbackImage(UUID.randomUUID(), format);
    }

    public UUID id() {
        return id;
    }

    public FeedbackImageFormat format() {
        return format;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof FeedbackImage that)) {
            return false;
        }
        return id.equals(that.id) && format == that.format;
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, format);
    }
}
