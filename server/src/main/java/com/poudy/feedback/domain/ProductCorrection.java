package com.poudy.feedback.domain;

import com.poudy.feedback.domain.image.FeedbackImage;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.Products;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
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
@Table(name = "product_correction_request")
public non-sealed class ProductCorrection extends Feedback {

    @Column(name = "product_id")
    private Long productId;

    @ElementCollection
    @CollectionTable(name = "product_correction_request_image", joinColumns = @JoinColumn(name = "request_id"))
    @OrderColumn(name = "display_order")
    @Column(name = "image_id")
    private List<UUID> imageIdRows;

    @Transient
    private String productName;

    @Transient
    private List<UUID> storedImageIds;

    protected ProductCorrection() {
    }

    public ProductCorrection(
        UUID id,
        Long productId,
        String productName,
        FeedbackContent content,
        OffsetDateTime receivedAt,
        List<FeedbackImage> images,
        FeedbackStatus status,
        OffsetDateTime statusChangedAt,
        OffsetDateTime completedAt
    ) {
        super(id, content, receivedAt, images, status, statusChangedAt, completedAt);
        this.productId = Objects.requireNonNull(productId, "정정할 제품 ID가 필요합니다.");
        this.productName = productName;
        this.storedImageIds = imageIds();
        this.imageIdRows = new ArrayList<>(storedImageIds);
    }

    public ProductCorrection(
        UUID id,
        Long productId,
        String productName,
        FeedbackContent content,
        OffsetDateTime receivedAt,
        List<FeedbackImage> images
    ) {
        this(id, productId, productName, content, receivedAt, images, FeedbackStatus.RECEIVED, receivedAt, null);
    }

    public ProductCorrection(
        UUID id,
        Long productId,
        String productName,
        FeedbackContent content,
        OffsetDateTime receivedAt
    ) {
        this(id, productId, productName, content, receivedAt, List.of());
    }

    public static ProductCorrection register(Product product, String content, Clock clock) {
        return new ProductCorrection(
            UUID.randomUUID(),
            product.id(),
            product.name(),
            new FeedbackContent(content),
            OffsetDateTime.now(clock)
        );
    }

    @PostLoad
    private void loadProductCorrection() {
        this.storedImageIds = List.copyOf(imageIdRows);
    }

    public Long productId() {
        return productId;
    }

    public String productName() {
        return productName;
    }

    @Override
    public FeedbackSubjectType type() {
        return FeedbackSubjectType.PRODUCT_CORRECTION;
    }

    @Override
    public List<UUID> storedImageIds() {
        return storedImageIds;
    }

    @Override
    public Feedback resolve(List<FeedbackImage> storedImages, Products products) {
        String resolvedName = products.findById(productId).map(Product::name).orElse(null);
        return new ProductCorrection(
            id(),
            productId,
            resolvedName,
            content(),
            receivedAt(),
            storedImages,
            status(),
            statusChangedAt(),
            completedAt()
        );
    }

    @Override
    protected Feedback copy(
        List<FeedbackImage> images,
        FeedbackStatus status,
        OffsetDateTime statusChangedAt,
        OffsetDateTime completedAt
    ) {
        return new ProductCorrection(
            id(),
            productId,
            productName,
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
        return other instanceof ProductCorrection that
            && productId.equals(that.productId)
            && Objects.equals(productName, that.productName);
    }
}
