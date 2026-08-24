package com.poudy.feedback.domain;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

public record Feedback(
        UUID id,
        FeedbackType type,
        FeedbackContent content,
        FeedbackPath path,
        OffsetDateTime receivedAt) {

    public Feedback {
        Objects.requireNonNull(id, "의견 접수 ID가 필요합니다.");
        Objects.requireNonNull(type, "의견 유형이 필요합니다.");
        Objects.requireNonNull(content, "의견 내용이 필요합니다.");
        Objects.requireNonNull(path, "의견 작성 화면 경로가 필요합니다.");
        Objects.requireNonNull(receivedAt, "의견 접수 시각이 필요합니다.");
    }

    public static Feedback register(FeedbackType type, String content, String path, Clock clock) {
        return new Feedback(
                UUID.randomUUID(),
                type,
                new FeedbackContent(content),
                new FeedbackPath(path),
                OffsetDateTime.now(clock));
    }
}
