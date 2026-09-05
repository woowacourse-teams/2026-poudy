package com.poudy.productrequest.domain;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.UUID;

public final class ProductRequest {

    private static final int CURRENT_SCHEMA_VERSION = 1;

    private final int schemaVersion;
    private final UUID requestId;
    private final String productName;
    private final String brandName;
    private final OffsetDateTime requestedAt;

    public ProductRequest(
        int schemaVersion,
        UUID requestId,
        String productName,
        String brandName,
        OffsetDateTime requestedAt
    ) {
        this.schemaVersion = schemaVersion;
        this.requestId = requestId;
        this.productName = productName;
        this.brandName = brandName;
        this.requestedAt = requestedAt;
    }

    public static ProductRequest create(String productName, String brandName, Clock clock) {
        return new ProductRequest(
            CURRENT_SCHEMA_VERSION,
            UUID.randomUUID(),
            productName,
            brandName,
            OffsetDateTime.now(clock)
        );
    }

    public int schemaVersion() {
        return schemaVersion;
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
}
