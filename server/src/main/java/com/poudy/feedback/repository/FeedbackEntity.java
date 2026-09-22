package com.poudy.feedback.repository;

import com.poudy.feedback.domain.Feedback;
import com.poudy.feedback.domain.FeedbackContent;
import com.poudy.feedback.domain.FeedbackPath;
import com.poudy.feedback.domain.FeedbackStatus;
import com.poudy.feedback.domain.FeedbackType;
import com.poudy.feedback.domain.ServiceFeedback;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "feedback")
public class FeedbackEntity {

    @Id
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "subject_type")
    private FeedbackType subjectType;

    @Column(name = "content")
    private String content;

    @Column(name = "page_path")
    private String pagePath;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private FeedbackStatus status;

    @Column(name = "status_changed_at")
    private LocalDateTime statusChangedAt;

    @ElementCollection
    @CollectionTable(name = "feedback_image", joinColumns = @JoinColumn(name = "feedback_id"))
    @OrderColumn(name = "display_order")
    private List<FeedbackImageValue> images = new ArrayList<>();

    protected FeedbackEntity() {
    }

    private FeedbackEntity(Feedback feedback, ServiceFeedback subject) {
        this.id = feedback.id();
        this.subjectType = subject.type();
        this.content = feedback.content().value();
        this.pagePath = subject.path().value().orElse(null);
        this.createdAt = local(feedback.receivedAt());
        this.status = feedback.status();
        this.statusChangedAt = local(feedback.statusChangedAt());
        this.images = new ArrayList<>(feedback.images().stream().map(FeedbackImageValue::from).toList());
    }

    public static FeedbackEntity from(Feedback feedback, ServiceFeedback subject) {
        return new FeedbackEntity(feedback, subject);
    }

    public Feedback toDomain(ZoneId zone, List<com.poudy.feedback.domain.image.FeedbackImage> resolvedImages) {
        OffsetDateTime changedAt = atZone(statusChangedAt, zone);
        return new Feedback(
            id,
            new ServiceFeedback(subjectType, FeedbackPath.from(pagePath)),
            new FeedbackContent(content),
            atZone(createdAt, zone),
            resolvedImages,
            status,
            changedAt,
            status == FeedbackStatus.COMPLETED ? changedAt : null
        );
    }

    public List<UUID> imageIds() {
        return images.stream().map(FeedbackImageValue::imageId).toList();
    }

    public UUID id() {
        return id;
    }

    static OffsetDateTime atZone(LocalDateTime value, ZoneId zone) {
        if (value == null) {
            return null;
        }
        return value.atZone(zone).toOffsetDateTime();
    }

    static LocalDateTime local(OffsetDateTime value) {
        return value.atZoneSameInstant(ZoneId.of("Asia/Seoul")).toLocalDateTime();
    }
}
