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
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.Formula;

@Entity
@Table(name = "product_correction_request")
public class ProductCorrectionRequestEntity {

    @Id
    private UUID id;

    @Column(name = "product_id")
    private Long productId;

    @Formula("(select product.product_name from product where product.id = product_id)")
    private String productName;

    @Column(name = "content")
    private String content;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private FeedbackStatus status;

    @Column(name = "status_changed_at")
    private LocalDateTime statusChangedAt;

    @ElementCollection
    @CollectionTable(name = "product_correction_request_image", joinColumns = @JoinColumn(name = "request_id"))
    @OrderColumn(name = "display_order")
    private List<FeedbackImageValue> images = new ArrayList<>();

    protected ProductCorrectionRequestEntity() {
    }

    private ProductCorrectionRequestEntity(Feedback feedback, ProductCorrection subject) {
        this.id = feedback.id();
        this.productId = subject.productId();
        this.content = feedback.content().value();
        this.createdAt = FeedbackEntity.local(feedback.receivedAt());
        this.status = feedback.status();
        this.statusChangedAt = FeedbackEntity.local(feedback.statusChangedAt());
        this.images = new ArrayList<>(feedback.images().stream().map(FeedbackImageValue::from).toList());
    }

    public static ProductCorrectionRequestEntity from(Feedback feedback, ProductCorrection subject) {
        return new ProductCorrectionRequestEntity(feedback, subject);
    }

    public Feedback toDomain(ZoneId zone, List<com.poudy.feedback.domain.image.FeedbackImage> resolvedImages) {
        OffsetDateTime changedAt = FeedbackEntity.atZone(statusChangedAt, zone);
        return new Feedback(
            id,
            new ProductCorrection(productId, productName),
            new FeedbackContent(content),
            FeedbackEntity.atZone(createdAt, zone),
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
}
