package com.poudy.product.repository;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;

@Embeddable
public record ProductIngredientId(
    @Column(name = "component_id") Long componentId,
    @Column(name = "ingredient_id") Long ingredientId) implements Serializable {
}
