package com.poudy.feedback.domain;

import com.poudy.feedback.domain.image.FeedbackImage;
import com.poudy.feedback.domain.image.InvalidFeedbackImageIdException;
import com.poudy.product.domain.Products;
import jakarta.persistence.Column;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PostLoad;
import jakarta.persistence.Transient;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@MappedSuperclass
public abstract sealed class Feedback permits ServiceFeedback, ProductCorrection {

    public static final int MAX_IMAGE_COUNT = 5;

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    @Id
    private UUID id;

    @Column(name = "content")
    private String contentText;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private FeedbackStatus status;

    @Column(name = "status_changed_at")
    private LocalDateTime statusChangedAtValue;

    @Transient
    private FeedbackContent content;

    @Transient
    private List<FeedbackImage> images;

    @Transient
    private OffsetDateTime completedAt;

    protected Feedback() {
    }

    protected Feedback(
        UUID id,
        FeedbackContent content,
        OffsetDateTime receivedAt,
        List<FeedbackImage> images,
        FeedbackStatus status,
        OffsetDateTime statusChangedAt,
        OffsetDateTime completedAt
    ) {
        this.id = Objects.requireNonNull(id, "의견 접수 ID가 필요합니다.");
        this.content = Objects.requireNonNull(content, "의견 내용이 필요합니다.");
        this.contentText = content.value();
        this.createdAt = local(Objects.requireNonNull(receivedAt, "의견 접수 시각이 필요합니다."));
        this.images = List.copyOf(Objects.requireNonNull(images, "의견 이미지 목록이 필요합니다."));
        if (this.images.size() > MAX_IMAGE_COUNT) {
            throw new InvalidFeedbackException("의견 이미지는 최대 " + MAX_IMAGE_COUNT + "개까지 첨부할 수 있습니다.");
        }
        if (this.images.stream().map(FeedbackImage::id).distinct().count() != this.images.size()) {
            throw new InvalidFeedbackImageIdException();
        }
        this.status = Objects.requireNonNull(status, "의견 처리 상태가 필요합니다.");
        this.statusChangedAtValue = local(Objects.requireNonNull(statusChangedAt, "의견 상태 변경 시각이 필요합니다."));
        if (completedAt != null) {
            this.completedAt = completedAt.atZoneSameInstant(SEOUL).toOffsetDateTime();
        }
        validateCompletedAt();
    }

    @PostLoad
    private void loadFeedback() {
        this.content = new FeedbackContent(contentText);
        this.images = List.of();
        if (status == FeedbackStatus.COMPLETED) {
            this.completedAt = statusChangedAt();
        }
    }

    public abstract FeedbackSubjectType type();

    public abstract List<UUID> storedImageIds();

    public abstract Feedback resolve(List<FeedbackImage> storedImages, Products products);

    protected abstract Feedback copy(
        List<FeedbackImage> images,
        FeedbackStatus status,
        OffsetDateTime statusChangedAt,
        OffsetDateTime completedAt
    );

    protected abstract boolean hasSameSubjectAs(Feedback other);

    public UUID id() {
        return id;
    }

    public FeedbackContent content() {
        return content;
    }

    public OffsetDateTime receivedAt() {
        return createdAt.atZone(SEOUL).toOffsetDateTime();
    }

    public List<FeedbackImage> images() {
        return images;
    }

    public FeedbackStatus status() {
        return status;
    }

    public OffsetDateTime statusChangedAt() {
        return statusChangedAtValue.atZone(SEOUL).toOffsetDateTime();
    }

    public OffsetDateTime completedAt() {
        return completedAt;
    }

    public boolean hasStatus(FeedbackStatus expected) {
        return status == expected;
    }

    public Feedback attachImages(List<FeedbackImage> images) {
        return copy(images, status, statusChangedAt(), completedAt);
    }

    public Feedback changeStatus(FeedbackStatus target, Clock clock) {
        Objects.requireNonNull(target, "목표 상태가 필요합니다.");
        Objects.requireNonNull(clock, "시계가 필요합니다.");
        if (hasStatus(target)) {
            return this;
        }

        OffsetDateTime changedAt = OffsetDateTime.now(clock);
        OffsetDateTime changedCompletedAt = null;
        if (target == FeedbackStatus.COMPLETED) {
            changedCompletedAt = changedAt;
        }
        return copy(images, target, changedAt, changedCompletedAt);
    }

    private void validateCompletedAt() {
        if (status == FeedbackStatus.COMPLETED && completedAt == null) {
            throw new InvalidFeedbackException("완료된 의견에는 완료 시각이 필요합니다.");
        }
        if (status != FeedbackStatus.COMPLETED && completedAt != null) {
            throw new InvalidFeedbackException("완료되지 않은 의견에는 완료 시각을 기록할 수 없습니다.");
        }
    }

    protected final List<UUID> imageIds() {
        return images.stream().map(FeedbackImage::id).toList();
    }

    private static LocalDateTime local(OffsetDateTime value) {
        return value.atZoneSameInstant(SEOUL).toLocalDateTime();
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
            && hasSameSubjectAs(that)
            && content.equals(that.content)
            && receivedAt().isEqual(that.receivedAt())
            && images.equals(that.images)
            && status == that.status
            && statusChangedAt().isEqual(that.statusChangedAt())
            && Objects.equals(completedAt, that.completedAt);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, content, images, status);
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
