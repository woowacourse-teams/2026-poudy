package com.poudy.feedback.domain;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

public final class Feedback {

    public static final int MAX_IMAGE_COUNT = 5;

    private final UUID id;
    private final FeedbackSubject subject;
    private final FeedbackContent content;
    private final OffsetDateTime receivedAt;
    private final List<FeedbackImage> images;

    public Feedback(
        UUID id,
        FeedbackSubject subject,
        FeedbackContent content,
        OffsetDateTime receivedAt,
        List<FeedbackImage> images
    ) {
        this.id = Objects.requireNonNull(id, "의견 접수 ID가 필요합니다.");
        this.subject = Objects.requireNonNull(subject, "의견 대상이 필요합니다.");
        this.content = Objects.requireNonNull(content, "의견 내용이 필요합니다.");
        this.receivedAt = Objects.requireNonNull(receivedAt, "의견 접수 시각이 필요합니다.");
        this.images = List.copyOf(Objects.requireNonNull(images, "의견 이미지 목록이 필요합니다."));
        if (this.images.size() > MAX_IMAGE_COUNT) {
            throw new InvalidFeedbackException("의견 이미지는 최대 " + MAX_IMAGE_COUNT + "개까지 첨부할 수 있습니다.");
        }
        if (this.images.stream().map(FeedbackImage::id).distinct().count() != this.images.size()) {
            throw new InvalidFeedbackImageIdException();
        }
    }

    public Feedback(
        UUID id,
        FeedbackSubject subject,
        FeedbackContent content,
        OffsetDateTime receivedAt
    ) {
        this(id, subject, content, receivedAt, List.of());
    }

    public static Feedback register(FeedbackSubject subject, String content, Clock clock) {
        return new Feedback(
            UUID.randomUUID(),
            subject,
            new FeedbackContent(content),
            OffsetDateTime.now(clock),
            List.of()
        );
    }

    public UUID id() {
        return id;
    }

    public FeedbackSubject subject() {
        return subject;
    }

    public FeedbackContent content() {
        return content;
    }

    public OffsetDateTime receivedAt() {
        return receivedAt;
    }

    public List<FeedbackImage> images() {
        return images;
    }

    public Feedback attachImages(List<FeedbackImage> images) {
        return new Feedback(id, subject, content, receivedAt, images);
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof Feedback that)) {
            return false;
        }
        return id.equals(that.id)
            && subject.equals(that.subject)
            && content.equals(that.content)
            && receivedAt.equals(that.receivedAt)
            && images.equals(that.images);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, subject, content, receivedAt, images);
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
