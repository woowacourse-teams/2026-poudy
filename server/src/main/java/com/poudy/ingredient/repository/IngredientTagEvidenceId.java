package com.poudy.ingredient.repository;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;

@Embeddable
public record IngredientTagEvidenceId(
    @Column(name = "ingredient_id") Long ingredientId,
    @Column(name = "tag_id") Long tagId,
    @Column(name = "display_order") Integer displayOrder) implements Serializable {

    public IngredientTagId ingredientTagId() {
        return new IngredientTagId(ingredientId, tagId);
    }
}
