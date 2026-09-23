package com.poudy.feedback.domain;

import com.poudy.feedback.domain.image.FeedbackImage;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.Products;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

public final class ProductCorrection extends Feedback {

    private final Long productId;
    private final String productName;

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
