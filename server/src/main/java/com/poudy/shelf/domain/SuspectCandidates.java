package com.poudy.shelf.domain;

import com.poudy.product.domain.Product;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class SuspectCandidates {

    private final Map<IngredientAnalysisReason, Set<Long>> ingredientsByReason;

    private SuspectCandidates(Map<IngredientAnalysisReason, Set<Long>> ingredientsByReason) {
        this.ingredientsByReason = ingredientsByReason;
    }

    public static SuspectCandidates of(
        Set<Long> excludeCodeIngredientIds,
        Map<SkinCaution, Set<Long>> cautionIngredientIds
    ) {
        Map<IngredientAnalysisReason, Set<Long>> candidateIngredients = new EnumMap<>(IngredientAnalysisReason.class);
        candidateIngredients.put(IngredientAnalysisReason.QUICK_EXCLUDE, Set.copyOf(excludeCodeIngredientIds));
        cautionIngredientIds.forEach((caution, ids) -> candidateIngredients.put(caution.reason(), Set.copyOf(ids)));
        return new SuspectCandidates(Map.copyOf(candidateIngredients));
    }

    public boolean contains(Long ingredientId) {
        return ingredientsByReason.values().stream().anyMatch(ids -> ids.contains(ingredientId));
    }

    public List<CautionIngredient> ingredientsIn(Product product) {
        return product.ingredients().stream()
            .filter(ingredient -> contains(ingredient.id()))
            .map(ingredient -> new CautionIngredient(ingredient, reasonsOf(ingredient.id())))
            .toList();
    }

    public List<IngredientAnalysisReason> reasonsOf(Long ingredientId) {
        return Arrays.stream(IngredientAnalysisReason.values())
            .filter(reason -> ingredientsByReason.getOrDefault(reason, Set.of()).contains(ingredientId))
            .toList();
    }
}
