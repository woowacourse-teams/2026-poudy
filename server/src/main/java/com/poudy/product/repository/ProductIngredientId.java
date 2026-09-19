package com.poudy.product.repository;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;

@Embeddable
public record ProductIngredientId(
    @Column(name = "product_id") Long productId,
    @Column(name = "component_order") Integer componentOrder,
    @Column(name = "display_order") Integer displayOrder) implements Serializable {
}
