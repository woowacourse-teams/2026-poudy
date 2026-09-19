package com.poudy.excludecode.repository;

import com.poudy.ingredient.domain.ExcludeCode;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import java.io.Serializable;

@Embeddable
public record ExcludeCodeIngredientId(
    @Enumerated(EnumType.STRING) @Column(name = "exclude_code") ExcludeCode excludeCode,
    @Column(name = "ingredient_id") Long ingredientId) implements Serializable {
}
