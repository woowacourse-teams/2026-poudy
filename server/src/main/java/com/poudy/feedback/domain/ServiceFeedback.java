package com.poudy.feedback.domain;

import com.poudy.feedback.domain.image.FeedbackImage;
import com.poudy.product.domain.Products;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

public final class ServiceFeedback extends Feedback {

    private final FeedbackType feedbackType;
    private final FeedbackPath path;

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
