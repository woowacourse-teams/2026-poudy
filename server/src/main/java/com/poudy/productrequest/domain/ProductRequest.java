package com.poudy.productrequest.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "product_request")
public class ProductRequest {

    @Id
    @Column(name = "id")
    private UUID requestId;

    @Column(name = "product_name")
    private String productName;

    @Column(name = "brand_name")
    private String brandName;

    @Column(name = "requested_at")
    private OffsetDateTime requestedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private ProductRequestStatus status;

    @Column(name = "status_changed_at")
    private OffsetDateTime statusChangedAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    protected ProductRequest() {
    }

    public ProductRequest(
        UUID requestId,
        String productName,
        String brandName,
        OffsetDateTime requestedAt
    ) {
        this(
            requestId,
            productName,
            brandName,
            requestedAt,
            ProductRequestStatus.RECEIVED,
            requestedAt,
            null
        );
    }

    public ProductRequest(
        UUID requestId,
        String productName,
        String brandName,
        OffsetDateTime requestedAt,
        ProductRequestStatus status,
        OffsetDateTime statusChangedAt,
        OffsetDateTime completedAt
    ) {
        this.requestId = Objects.requireNonNull(requestId, "제품 등록 요청 ID가 필요합니다.");
        this.productName = productName;
        this.brandName = brandName;
        this.requestedAt = Objects.requireNonNull(requestedAt, "제품 등록 요청 시각이 필요합니다.");
        this.status = Objects.requireNonNull(status, "제품 등록 요청 상태가 필요합니다.");
        this.statusChangedAt = Objects.requireNonNull(statusChangedAt, "상태 변경 시각이 필요합니다.");
        this.completedAt = completedAt;
        validateCompletedAt();
    }

    public static ProductRequest create(String productName, String brandName, Clock clock) {
        OffsetDateTime requestedAt = OffsetDateTime.now(clock);
        return new ProductRequest(
            UUID.randomUUID(),
            productName,
            brandName,
            requestedAt,
            ProductRequestStatus.RECEIVED,
            requestedAt,
            null
        );
    }

    public UUID requestId() {
        return requestId;
    }

    public String productName() {
        return productName;
    }

    public String brandName() {
        return brandName;
    }

    public OffsetDateTime requestedAt() {
        return requestedAt;
    }

    public ProductRequestStatus status() {
        return status;
    }

    public OffsetDateTime statusChangedAt() {
        return statusChangedAt;
    }

    public OffsetDateTime completedAt() {
        return completedAt;
    }

    public boolean hasStatus(ProductRequestStatus expected) {
        return status == expected;
    }

    public boolean hasSameHistoryAs(ProductRequest other) {
        if (other == null) {
            return false;
        }
        return requestId.equals(other.requestId)
            && Objects.equals(productName, other.productName)
            && Objects.equals(brandName, other.brandName)
            && requestedAt.equals(other.requestedAt)
            && status == other.status
            && statusChangedAt.equals(other.statusChangedAt)
            && Objects.equals(completedAt, other.completedAt);
    }

    public ProductRequest changeStatus(ProductRequestStatus target, Clock clock) {
        Objects.requireNonNull(target, "변경할 상태가 필요합니다.");
        Objects.requireNonNull(clock, "시계가 필요합니다.");
        if (hasStatus(target)) {
            return this;
        }

        OffsetDateTime changedAt = OffsetDateTime.now(clock);
        return new ProductRequest(
            requestId,
            productName,
            brandName,
            requestedAt,
            target,
            changedAt,
            target == ProductRequestStatus.COMPLETED ? changedAt : null
        );
    }

    private void validateCompletedAt() {
        if (status == ProductRequestStatus.COMPLETED && completedAt == null) {
            throw new IllegalArgumentException("완료된 제품 등록 요청에는 완료 시각이 필요합니다.");
        }
        if (status != ProductRequestStatus.COMPLETED && completedAt != null) {
            throw new IllegalArgumentException("완료되지 않은 제품 등록 요청에는 완료 시각을 기록할 수 없습니다.");
        }
    }
}
