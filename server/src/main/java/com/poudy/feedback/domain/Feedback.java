package com.poudy.feedback.domain;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

public record Feedback(
    UUID id,
    FeedbackType type,
    FeedbackContent content,
    FeedbackPath path,
    OffsetDateTime receivedAt,
    List<FeedbackImage> images) {

    public static final int MAX_IMAGE_COUNT = 5;

    public Feedback {
        Objects.requireNonNull(id, "의견 접수 ID가 필요합니다.");
        Objects.requireNonNull(type, "의견 유형이 필요합니다.");
        Objects.requireNonNull(content, "의견 내용이 필요합니다.");
        Objects.requireNonNull(path, "의견 작성 화면 경로가 필요합니다.");
        Objects.requireNonNull(receivedAt, "의견 접수 시각이 필요합니다.");
        images = List.copyOf(Objects.requireNonNull(images, "의견 이미지 목록이 필요합니다."));
        if (images.size() > MAX_IMAGE_COUNT) {
            throw new InvalidFeedbackException("의견 이미지는 최대 " + MAX_IMAGE_COUNT + "개까지 첨부할 수 있습니다.");
        }
        if (images.stream().map(FeedbackImage::id).distinct().count() != images.size()) {
            throw new InvalidFeedbackImageIdException();
        }
    }

    public Feedback(
        UUID id,
        FeedbackType type,
        FeedbackContent content,
        FeedbackPath path,
        OffsetDateTime receivedAt
    ) {
        this(id, type, content, path, receivedAt, List.of());
    }

    public static Feedback register(FeedbackType type, String content, String path, Clock clock) {
        return new Feedback(
            UUID.randomUUID(),
            type,
            new FeedbackContent(content),
            new FeedbackPath(path),
            OffsetDateTime.now(clock),
            List.of()
        );
    }

    public Feedback attachImages(List<FeedbackImage> images) {
        return new Feedback(id, type, content, path, receivedAt, images);
    }

    public static List<UUID> normalizeImageIds(List<UUID> imageIds) {
        List<UUID> normalized = List.of();
        if (imageIds != null) {
            normalized = List.copyOf(imageIds);
        }
        if (normalized.size() > MAX_IMAGE_COUNT
            || new HashSet<>(normalized).size() != normalized.size()) {
            throw new InvalidFeedbackImageIdException();
        }
        return normalized;
    }
}
