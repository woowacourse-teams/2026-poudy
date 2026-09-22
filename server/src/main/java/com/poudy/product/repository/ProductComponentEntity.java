package com.poudy.product.repository;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "product_component")
public class ProductComponentEntity {

    @Id
    private Long id;

    @Column(name = "product_id")
    private Long productId;

    @Column(name = "display_order")
    private Integer displayOrder;

    protected ProductComponentEntity() {
    }

    public Long productId() {
        return productId;
    }
}
