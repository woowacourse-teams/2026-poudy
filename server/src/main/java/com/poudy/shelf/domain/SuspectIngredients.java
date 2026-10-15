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
        List<ProductIngredients> unsuitedIngredients = unsuited.stream().map(ProductIngredients::new).toList();
        List<ProductIngredients> suitedIngredients = suited.stream().map(ProductIngredients::new).toList();
        return new SuspectIngredients(
            candidatesIn(unsuitedIngredients, candidates).stream()
                .map(ingredient -> suspect(ingredient, unsuitedIngredients, suitedIngredients, candidates))
                .filter(suspect -> !suspect.isOffsetBySuitedProducts())
                .sorted(SuspectIngredient.ORDER)
                .toList()
        );
    }

    private static List<Ingredient> candidatesIn(List<ProductIngredients> unsuited, SuspectCandidates candidates) {
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
        List<ProductIngredients> unsuited,
        List<ProductIngredients> suited,
        SuspectCandidates candidates
    ) {
        List<ProductIngredients> unsuitedContaining = unsuited.stream()
            .filter(product -> product.contains(ingredient.id()))
            .toList();
        int suitedCount = (int) suited.stream().filter(product -> product.contains(ingredient.id())).count();
        return new SuspectIngredient(
            ingredient,
            unsuitedContaining.stream().map(ProductIngredients::product).toList(),
            new SuspectEvidence(unsuitedContaining.size(), unsuited.size(), suitedCount, suited.size()),
            candidates.isCaution(ingredient.id()),
            unsuitedContaining.stream().mapToInt(product -> product.positionOf(ingredient.id())).min().orElseThrow()
        );
    }

    public List<SuspectIngredient> items() {
        return items;
    }

    public List<Long> ingredientIds() {
        return items.stream().map(SuspectIngredient::id).toList();
    }

    public boolean isContainedIn(Product product) {
        List<Long> ingredientIds = ingredientIds();
        return product.ingredients().stream().anyMatch(ingredient -> ingredientIds.contains(ingredient.id()));
    }

    private record ProductIngredients(Product product, List<Ingredient> ingredients, List<Long> ingredientIds) {

        private ProductIngredients(Product product) {
            this(product, product.ingredients());
        }

        private ProductIngredients(Product product, List<Ingredient> ingredients) {
            this(product, ingredients, ingredients.stream().map(Ingredient::id).toList());
        }

        private boolean contains(Long ingredientId) {
            return ingredientIds.contains(ingredientId);
        }

        private int positionOf(Long ingredientId) {
            return ingredientIds.indexOf(ingredientId);
        }
    }
}
