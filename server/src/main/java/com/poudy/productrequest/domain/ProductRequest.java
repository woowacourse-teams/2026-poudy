package com.poudy.productrequest.domain;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

public record ProductRequest(
        int schemaVersion,
        UUID requestId,
        String productName,
        String brandName,
        OffsetDateTime requestedAt) {

    public static final int MAX_PRODUCT_NAME_LENGTH = 200;
    public static final int MAX_BRAND_NAME_LENGTH = 100;

    private static final int CURRENT_SCHEMA_VERSION = 1;

    public ProductRequest {
        Objects.requireNonNull(requestId, "제품 등록 요청 ID가 필요합니다.");
        Objects.requireNonNull(requestedAt, "제품 등록 요청 시각이 필요합니다.");
        productName = normalizeRequiredProductName(productName);
        brandName = normalizeOptionalBrandName(brandName);
    }

    public static ProductRequest create(String productName, String brandName, Clock clock) {
        return new ProductRequest(
                CURRENT_SCHEMA_VERSION,
                UUID.randomUUID(),
                productName,
                brandName,
                OffsetDateTime.now(clock));
    }

    public static boolean hasValidNames(String productName, String brandName) {
        try {
            normalizeRequiredProductName(productName);
            normalizeOptionalBrandName(brandName);
            return true;
        } catch (InvalidProductRequestException exception) {
            return false;
        }
    }

    private static String normalizeRequiredProductName(String productName) {
        String normalized = normalize(productName);
        if (normalized == null || normalized.isEmpty()) {
            throw new InvalidProductRequestException("제품명이 필요합니다.");
        }
        if (normalized.length() > MAX_PRODUCT_NAME_LENGTH) {
            throw new InvalidProductRequestException("제품명은 200자를 넘을 수 없습니다.");
        }
        return normalized;
    }

    private static String normalizeOptionalBrandName(String brandName) {
        String normalized = normalize(brandName);
        if (normalized == null || normalized.isEmpty()) {
            return null;
        }
        if (normalized.length() > MAX_BRAND_NAME_LENGTH) {
            throw new InvalidProductRequestException("브랜드명은 100자를 넘을 수 없습니다.");
        }
        return normalized;
    }

    private static String normalize(String value) {
        return value == null ? null : value.strip();
    }
}
