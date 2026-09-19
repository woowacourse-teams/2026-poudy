package com.poudy.excludecode.repository;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "exclude_code_ingredient")
public class ExcludeCodeIngredientEntity {

    @EmbeddedId
    private ExcludeCodeIngredientId id;

    @Column(name = "display_order")
    private Integer displayOrder;

    protected ExcludeCodeIngredientEntity() {
    }

    public ExcludeCodeIngredientId id() {
        return id;
    }
}
