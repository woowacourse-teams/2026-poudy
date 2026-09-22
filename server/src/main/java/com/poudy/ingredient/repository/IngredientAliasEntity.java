package com.poudy.ingredient.repository;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "ingredient_alias")
public class IngredientAliasEntity {

    @Id
    private Long id;

    @Column(name = "ingredient_id")
    private Long ingredientId;

    @Column(name = "alias")
    private String alias;

    protected IngredientAliasEntity() {
    }

    public Long ingredientId() {
        return ingredientId;
    }

    public String alias() {
        return alias;
    }
}
