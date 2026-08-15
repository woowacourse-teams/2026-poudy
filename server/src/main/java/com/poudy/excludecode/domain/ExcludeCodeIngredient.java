package com.poudy.excludecode.domain;

import com.poudy.ingredient.domain.Ingredient;

public record ExcludeCodeIngredient(Long id, String koreanName, String englishName) {

    public static ExcludeCodeIngredient from(Ingredient ingredient) {
        return new ExcludeCodeIngredient(ingredient.id(), ingredient.koreanName(), ingredient.englishName());
    }

    public boolean hasId(Long other) {
        return id.equals(other);
    }
}
