package com.poudy.ingredient.domain;

import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

public final class IngredientCatalog {

    private final Map<Long, Ingredient> ingredients;

    private IngredientCatalog(Map<Long, Ingredient> ingredients) {
        this.ingredients = ingredients;
    }

    public static IngredientCatalog from(List<Ingredient> ingredients) {
        List<Ingredient> copied = List.copyOf(Objects.requireNonNullElse(ingredients, List.of()));
        Map<Long, Ingredient> indexedIngredients = new LinkedHashMap<>();

        for (Ingredient ingredient : copied) {
            if (indexedIngredients.putIfAbsent(ingredient.id(), ingredient) != null) {
                throw new IllegalArgumentException("성분 ID가 중복되었습니다: " + ingredient.id());
            }
        }

        return new IngredientCatalog(Collections.unmodifiableMap(indexedIngredients));
    }

    public Ingredients resolveInOrder(Collection<Long> ids) {
        List<Ingredient> resolvedIngredients = Objects.requireNonNullElse(ids, List.<Long>of()).stream()
            .map(ingredients::get)
            .filter(Objects::nonNull)
            .toList();

        return new Ingredients(resolvedIngredients);
    }
}
