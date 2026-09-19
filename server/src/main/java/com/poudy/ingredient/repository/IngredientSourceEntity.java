package com.poudy.ingredient.repository;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "ingredient_source")
public class IngredientSourceEntity {

    @EmbeddedId
    private IngredientOrderId id;

    @Column(name = "content")
    private String content;

    protected IngredientSourceEntity() {
    }

    public Long ingredientId() {
        return id.ingredientId();
    }

    public String content() {
        return content;
    }
}
