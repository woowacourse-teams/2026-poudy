package com.poudy.productrequest.repository;

import com.poudy.productrequest.domain.ProductRequest;
import com.poudy.productrequest.domain.ProductRequestStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "product_request")
public class ProductRequestEntity {

    @Id
    private UUID id;

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

    protected ProductRequestEntity() {
    }

    private ProductRequestEntity(ProductRequest request) {
        this.id = request.requestId();
        this.productName = request.productName();
        this.brandName = request.brandName();
        this.requestedAt = request.requestedAt();
        this.status = request.status();
        this.statusChangedAt = request.statusChangedAt();
        this.completedAt = request.completedAt();
    }

    public static ProductRequestEntity from(ProductRequest request) {
        return new ProductRequestEntity(request);
    }

    public ProductRequest toDomain() {
        return new ProductRequest(id, productName, brandName, requestedAt, status, statusChangedAt, completedAt);
    }
}
