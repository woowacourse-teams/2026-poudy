package com.poudy.productrequest.domain;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ProductRequest(
        int schemaVersion,
        UUID requestId,
        String productName,
        String brandName,
        OffsetDateTime requestedAt) {

    private static final int CURRENT_SCHEMA_VERSION = 1;

    public static ProductRequest create(String productName, String brandName, Clock clock) {
        return new ProductRequest(
                CURRENT_SCHEMA_VERSION,
                UUID.randomUUID(),
                productName,
                brandName,
                OffsetDateTime.now(clock));
    }
}
