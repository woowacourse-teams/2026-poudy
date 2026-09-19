package com.poudy.ingredient.repository;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "ingredient_alias")
public class IngredientAliasEntity {

    @EmbeddedId
    private IngredientOrderId id;

    @Column(name = "alias")
    private String alias;

    protected IngredientAliasEntity() {
    }

    public Long ingredientId() {
        return id.ingredientId();
    }

    public String alias() {
        return alias;
    }
}
