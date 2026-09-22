package com.poudy.ingredient.repository;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "ingredient_source")
public class IngredientSourceEntity {

    @Id
    private Long id;

    @Column(name = "ingredient_id")
    private Long ingredientId;

    @Column(name = "type")
    private String type;

    @Column(name = "content")
    private String content;

    protected IngredientSourceEntity() {
    }

    public Long ingredientId() {
        return ingredientId;
    }

    public String content() {
        return content;
    }

    public boolean isInfo() {
        return "INFO".equals(type);
    }

    public boolean isEffect() {
        return "EFFECT".equals(type);
    }
}
