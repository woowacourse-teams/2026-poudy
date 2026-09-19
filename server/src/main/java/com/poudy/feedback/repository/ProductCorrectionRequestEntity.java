package com.poudy.feedback.repository;

import com.poudy.feedback.domain.Feedback;
import com.poudy.feedback.domain.FeedbackContent;
import com.poudy.feedback.domain.FeedbackStatus;
import com.poudy.feedback.domain.ProductCorrection;
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
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "product_correction_request")
public class ProductCorrectionRequestEntity {

    @Id
    private UUID id;

    @Column(name = "product_id")
    private Long productId;

    @Column(name = "product_name")
    private String productName;

    @Column(name = "content")
    private String content;

    @Column(name = "received_at")
    private OffsetDateTime receivedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private FeedbackStatus status;

    @Column(name = "status_changed_at")
    private OffsetDateTime statusChangedAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @ElementCollection
    @CollectionTable(name = "product_correction_request_image", joinColumns = @JoinColumn(name = "request_id"))
    @OrderColumn(name = "display_order")
    private List<FeedbackImageValue> images = new ArrayList<>();

    protected ProductCorrectionRequestEntity() {
    }

    private ProductCorrectionRequestEntity(Feedback feedback, ProductCorrection subject) {
        this.id = feedback.id();
        this.productId = subject.productId();
        this.productName = subject.productName();
        this.content = feedback.content().value();
        this.receivedAt = feedback.receivedAt();
        this.status = feedback.status();
        this.statusChangedAt = feedback.statusChangedAt();
        this.completedAt = feedback.completedAt();
        this.images = new ArrayList<>(feedback.images().stream().map(FeedbackImageValue::from).toList());
    }

    public static ProductCorrectionRequestEntity from(Feedback feedback, ProductCorrection subject) {
        return new ProductCorrectionRequestEntity(feedback, subject);
    }

    public Feedback toDomain(ZoneId zone) {
        return new Feedback(
            id,
            new ProductCorrection(productId, productName),
            new FeedbackContent(content),
            FeedbackEntity.atZone(receivedAt, zone),
            images.stream().map(FeedbackImageValue::toDomain).toList(),
            status,
            FeedbackEntity.atZone(statusChangedAt, zone),
            FeedbackEntity.atZone(completedAt, zone)
        );
    }
}
