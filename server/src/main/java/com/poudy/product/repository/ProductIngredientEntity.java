package com.poudy.product.repository;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "product_ingredient")
public class ProductIngredientEntity {

    @EmbeddedId
    private ProductIngredientId id;

    @Column(name = "ingredient_id")
    private Long ingredientId;

    protected ProductIngredientEntity() {
    }

    public Long productId() {
        return id.productId();
    }

    public Long ingredientId() {
        return ingredientId;
    }
}
