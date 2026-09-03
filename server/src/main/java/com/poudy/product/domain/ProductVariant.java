package com.poudy.product.domain;

import java.math.BigDecimal;

public final class ProductVariant {

    private final Long id;
    private final Long price;
    private final BigDecimal volumeValue;
    private final String volumeUnit;
    private final String status;

    public ProductVariant(Long id, Long price, BigDecimal volumeValue, String volumeUnit, String status) {
        if (price == null || price < 0) {
            throw new IllegalArgumentException("제품 가격은 0 이상이어야 합니다.");
        }
        if (volumeValue == null || volumeValue.signum() < 0) {
            throw new IllegalArgumentException("제품 용량은 0 이상이어야 합니다.");
        }
        if (volumeUnit == null || volumeUnit.isBlank()) {
            throw new IllegalArgumentException("제품 용량 단위가 필요합니다.");
        }
        if (status == null || status.isBlank()) {
            throw new IllegalArgumentException("제품 판매 상태가 필요합니다.");
        }

        this.id = id;
        this.price = price;
        this.volumeValue = volumeValue;
        this.volumeUnit = volumeUnit;
        this.status = status;
    }

    public Long id() {
        return id;
    }

    public Long price() {
        return price;
    }

    public BigDecimal volumeValue() {
        return volumeValue;
    }

    public String volumeUnit() {
        return volumeUnit;
    }

    public String status() {
        return status;
    }
}
