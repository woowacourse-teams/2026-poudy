package com.poudy.product.repository;

import com.poudy.product.domain.ProductVariant;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "product_variant")
public class ProductVariantEntity {

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

    protected ProductVariantEntity() {
    }

    public Long productId() {
        return productId;
    }

    public ProductVariant toDomain() {
        return new ProductVariant(id, price, withoutTrailingZeros(volumeValue), volumeUnit, status);
    }

    private static BigDecimal withoutTrailingZeros(BigDecimal value) {
        BigDecimal stripped = value.stripTrailingZeros();
        if (stripped.scale() < 0) {
            return stripped.setScale(0);
        }
        return stripped;
    }
}
