package com.poudy.product.repository;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "product_ingredient")
public class ProductIngredientEntity {

    @EmbeddedId
    private ProductIngredientId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "component_id", insertable = false, updatable = false)
    private ProductComponentEntity component;

    @Column(name = "display_order")
    private Integer displayOrder;

    protected ProductIngredientEntity() {
    }

    public Long productId() {
        return component.productId();
    }

    public Long ingredientId() {
        return id.ingredientId();
    }
}
