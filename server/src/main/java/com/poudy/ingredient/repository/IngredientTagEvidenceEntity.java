package com.poudy.ingredient.repository;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "ingredient_tag_evidence")
public class IngredientTagEvidenceEntity {

    @EmbeddedId
    private IngredientTagEvidenceId id;

    @Column(name = "content")
    private String content;

    protected IngredientTagEvidenceEntity() {
    }

    public IngredientTagId ingredientTagId() {
        return id.ingredientTagId();
    }

    public String content() {
        return content;
    }
}
