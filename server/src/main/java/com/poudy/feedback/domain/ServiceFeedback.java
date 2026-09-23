package com.poudy.feedback.domain;

import com.poudy.feedback.domain.image.FeedbackImage;
import com.poudy.product.domain.Products;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.PostLoad;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "feedback")
public non-sealed class ServiceFeedback extends Feedback {

    @Enumerated(EnumType.STRING)
    @Column(name = "subject_type")
    private FeedbackType feedbackType;

    @Column(name = "page_path")
    private String pagePath;

    @ElementCollection
    @CollectionTable(name = "feedback_image", joinColumns = @JoinColumn(name = "feedback_id"))
    @OrderColumn(name = "display_order")
    @Column(name = "image_id")
    private List<UUID> imageIdRows;

    @Transient
    private FeedbackPath path;

    @Transient
    private List<UUID> storedImageIds;

    protected ServiceFeedback() {
    }

    public ServiceFeedback(
        UUID id,
        FeedbackType feedbackType,
        FeedbackPath path,
        FeedbackContent content,
        OffsetDateTime receivedAt,
        List<FeedbackImage> images,
        FeedbackStatus status,
        OffsetDateTime statusChangedAt,
        OffsetDateTime completedAt
    ) {
        super(id, content, receivedAt, images, status, statusChangedAt, completedAt);
        this.feedbackType = Objects.requireNonNull(feedbackType, "의견 유형이 필요합니다.");
        this.path = Objects.requireNonNull(path, "의견 작성 화면이 필요합니다.");
        this.pagePath = path.value().orElse(null);
        this.storedImageIds = imageIds();
        this.imageIdRows = new ArrayList<>(storedImageIds);
    }

    public ServiceFeedback(
        UUID id,
        FeedbackType feedbackType,
        FeedbackPath path,
        FeedbackContent content,
        OffsetDateTime receivedAt,
        List<FeedbackImage> images
    ) {
        this(id, feedbackType, path, content, receivedAt, images, FeedbackStatus.RECEIVED, receivedAt, null);
    }

    public ServiceFeedback(
        UUID id,
        FeedbackType feedbackType,
        FeedbackPath path,
        FeedbackContent content,
        OffsetDateTime receivedAt
    ) {
        this(id, feedbackType, path, content, receivedAt, List.of());
    }

    public static ServiceFeedback register(FeedbackType feedbackType, FeedbackPath path, String content, Clock clock) {
        return new ServiceFeedback(
            UUID.randomUUID(),
            feedbackType,
            path,
            new FeedbackContent(content),
            OffsetDateTime.now(clock)
        );
    }

    @PostLoad
    private void loadServiceFeedback() {
        this.path = FeedbackPath.from(pagePath);
        this.storedImageIds = List.copyOf(imageIdRows);
    }

    public FeedbackType feedbackType() {
        return feedbackType;
    }

    public FeedbackPath path() {
        return path;
    }

    @Override
    public FeedbackSubjectType type() {
        return FeedbackSubjectType.valueOf(feedbackType.name());
    }

    @Override
    public List<UUID> storedImageIds() {
        return storedImageIds;
    }

    @Override
    public Feedback resolve(List<FeedbackImage> storedImages, Products products) {
        return copy(storedImages, status(), statusChangedAt(), completedAt());
    }

    @Override
    protected Feedback copy(
        List<FeedbackImage> images,
        FeedbackStatus status,
        OffsetDateTime statusChangedAt,
        OffsetDateTime completedAt
    ) {
        return new ServiceFeedback(
            id(),
            feedbackType,
            path,
            content(),
            receivedAt(),
            images,
            status,
            statusChangedAt,
            completedAt
        );
    }

    @Override
    protected boolean hasSameSubjectAs(Feedback other) {
        return other instanceof ServiceFeedback that && feedbackType == that.feedbackType && path.equals(that.path);
    }
}
