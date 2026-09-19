package com.poudy.product.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PostLoad;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "product_variant")
public class ProductVariant {

    @Id
    private Long id;

    @Column(name = "product_id")
    private Long productId;

    @Column(name = "display_order")
    private Integer displayOrder;

    @Column(name = "price")
    private Long price;

    @Column(name = "volume_value")
    private BigDecimal volumeValue;

    @Column(name = "volume_unit")
    private String volumeUnit;

    @Column(name = "status")
    private String status;

    protected ProductVariant() {
    }

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

    @PostLoad
    private void stripVolumeTrailingZeros() {
        BigDecimal stripped = volumeValue.stripTrailingZeros();
        if (stripped.scale() < 0) {
            stripped = stripped.setScale(0);
        }
        this.volumeValue = stripped;
    }

    public Long id() {
        return id;
    }

    public Long productId() {
        return productId;
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
