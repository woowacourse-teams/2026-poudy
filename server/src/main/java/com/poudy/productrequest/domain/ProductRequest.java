package com.poudy.productrequest.domain;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

public final class ProductRequest {

    private final UUID requestId;
    private final String productName;
    private final String brandName;
    private final OffsetDateTime requestedAt;
    private final ProductRequestStatus status;
    private final OffsetDateTime statusChangedAt;
    private final OffsetDateTime completedAt;

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
