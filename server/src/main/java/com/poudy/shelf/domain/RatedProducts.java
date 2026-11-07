package com.poudy.shelf.domain;

import com.poudy.ingredient.domain.Ingredient;
import com.poudy.product.domain.Product;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class RatedProducts {

    private final List<Product> unsuitedProducts;
    private final List<Product> suitedProducts;

    public RatedProducts(List<Product> unsuitedProducts, List<Product> suitedProducts) {
        this.unsuitedProducts = List.copyOf(unsuitedProducts);
        this.suitedProducts = List.copyOf(suitedProducts);
    }

    public SuspectIngredients suspectIngredients(SuspectCandidates candidates) {
        List<Ingredient> candidateIngredients = candidatesInUnsuitedProducts(candidates);
        List<SuspectIngredient> suspects = candidateIngredients.stream()
            .map(ingredient -> suspect(ingredient, candidates))
            .toList();
        return SuspectIngredients.from(suspects);
    }

    private List<Ingredient> candidatesInUnsuitedProducts(SuspectCandidates candidates) {
        Map<Long, Ingredient> candidateIngredients = new LinkedHashMap<>();
        unsuitedProducts.forEach(
            product -> product.ingredients().stream()
                .filter(ingredient -> candidates.contains(ingredient.id()))
                .forEach(ingredient -> candidateIngredients.putIfAbsent(ingredient.id(), ingredient))
        );
        return List.copyOf(candidateIngredients.values());
    }

    private SuspectIngredient suspect(Ingredient ingredient, SuspectCandidates candidates) {
        List<Product> containingUnsuitedProducts = unsuitedProducts.stream()
            .filter(product -> product.containsIngredient(ingredient.id()))
            .toList();
        int suitedCount = (int) suitedProducts.stream()
            .filter(product -> product.containsIngredient(ingredient.id()))
            .count();
        SuspectEvidence evidence = new SuspectEvidence(
            containingUnsuitedProducts.size(),
            unsuitedProducts.size(),
            suitedCount,
            suitedProducts.size()
        );
        int firstPosition = containingUnsuitedProducts.stream()
            .mapToInt(product -> product.ingredientPosition(ingredient.id()))
            .min()
            .orElseThrow();
        return new SuspectIngredient(
            ingredient,
            containingUnsuitedProducts,
            evidence,
            candidates.reasonsOf(ingredient.id()),
            firstPosition
        );
    }
}
