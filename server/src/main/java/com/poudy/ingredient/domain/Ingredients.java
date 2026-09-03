package com.poudy.ingredient.domain;

import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

public final class Ingredients {

    private final List<Ingredient> ingredients;

    public Ingredients(List<Ingredient> ingredients) {
        this.ingredients = List.copyOf(Objects.requireNonNullElse(ingredients, List.of()));
    }

    public boolean contains(Long ingredientId) {
        if (ingredientId == null) {
            return false;
        }

        return ingredients.stream().anyMatch(ingredient -> ingredient.hasId(ingredientId));
    }

    public Optional<Ingredient> findById(Long ingredientId) {
        return ingredients.stream()
            .filter(ingredient -> ingredient.hasId(ingredientId))
            .findFirst();
    }

    public boolean containsAll(Collection<Long> ingredientIds) {
        return ingredientIds.stream().allMatch(this::contains);
    }

    public boolean containsAny(Collection<Long> ingredientIds) {
        return ingredientIds.stream().anyMatch(this::contains);
    }

    public List<Ingredient> values() {
        return ingredients;
    }
}
