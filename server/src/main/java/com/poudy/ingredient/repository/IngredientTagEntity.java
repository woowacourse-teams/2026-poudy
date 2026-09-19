package com.poudy.ingredient.repository;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "ingredient_tag")
public class IngredientTagEntity {

    @EmbeddedId
    private IngredientTagId id;

    @Column(name = "display_order")
    private Integer displayOrder;

    protected IngredientTagEntity() {
    }

    public IngredientTagId id() {
        return id;
    }
}
