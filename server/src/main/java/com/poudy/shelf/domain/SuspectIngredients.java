package com.poudy.shelf.domain;

import com.poudy.ingredient.domain.Ingredient;
import com.poudy.product.domain.Product;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class SuspectIngredients {

    private final List<SuspectIngredient> items;

    private SuspectIngredients(List<SuspectIngredient> items) {
        this.items = List.copyOf(items);
    }

    public static SuspectIngredients of(List<Product> unsuited, List<Product> suited, SuspectCandidates candidates) {
        return new SuspectIngredients(
            candidatesIn(unsuited, candidates).stream()
                .map(ingredient -> suspect(ingredient, unsuited, suited, candidates))
                .filter(suspect -> !suspect.isOffsetBySuitedProducts())
                .sorted(SuspectIngredient.ORDER)
                .toList()
        );
    }

    private static List<Ingredient> candidatesIn(List<Product> unsuited, SuspectCandidates candidates) {
        Map<Long, Ingredient> ingredientsById = new LinkedHashMap<>();
        unsuited.forEach(
            product -> product.ingredients().stream()
                .filter(ingredient -> candidates.contains(ingredient.id()))
                .forEach(ingredient -> ingredientsById.putIfAbsent(ingredient.id(), ingredient))
        );
        return List.copyOf(ingredientsById.values());
    }

    private static SuspectIngredient suspect(
        Ingredient ingredient,
        List<Product> unsuited,
        List<Product> suited,
        SuspectCandidates candidates
    ) {
        List<Product> unsuitedContaining = unsuited.stream()
            .filter(product -> product.containsIngredient(ingredient.id()))
            .toList();
        int suitedCount = (int) suited.stream().filter(product -> product.containsIngredient(ingredient.id())).count();
        return new SuspectIngredient(
            ingredient,
            unsuitedContaining,
            new SuspectEvidence(unsuitedContaining.size(), unsuited.size(), suitedCount, suited.size()),
            candidates.isCaution(ingredient.id()),
            unsuitedContaining.stream().mapToInt(product -> product.ingredientPosition(ingredient.id())).min()
                .orElseThrow()
        );
    }

    public List<SuspectIngredient> items() {
        return items;
    }

    public List<Long> ingredientIds() {
        return items.stream().map(SuspectIngredient::id).toList();
    }

    public boolean isContainedIn(Product product) {
        return items.stream().anyMatch(suspect -> product.containsIngredient(suspect.id()));
    }
}
