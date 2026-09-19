package com.poudy.ingredient.repository;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;

@Embeddable
public record IngredientTagId(
    @Column(name = "ingredient_id") Long ingredientId,
    @Column(name = "tag_id") Long tagId) implements Serializable {
}
