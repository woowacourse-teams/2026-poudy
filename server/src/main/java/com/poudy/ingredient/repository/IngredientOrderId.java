package com.poudy.ingredient.repository;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;

@Embeddable
public record IngredientOrderId(
    @Column(name = "ingredient_id") Long ingredientId,
    @Column(name = "display_order") Integer displayOrder) implements Serializable {
}
