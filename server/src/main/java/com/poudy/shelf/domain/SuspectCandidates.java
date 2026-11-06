package com.poudy.shelf.domain;

import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class SuspectCandidates {

    private final Map<IngredientAnalysisReason, Set<Long>> ingredientsByReason;

    public SuspectCandidates(Set<Long> excludeCodeIngredientIds, Map<SkinCaution, Set<Long>> cautionIngredientIds) {
        Map<IngredientAnalysisReason, Set<Long>> byReason = new EnumMap<>(IngredientAnalysisReason.class);
        byReason.put(IngredientAnalysisReason.QUICK_EXCLUDE, Set.copyOf(excludeCodeIngredientIds));
        cautionIngredientIds.forEach((caution, ids) -> byReason.put(caution.reason(), Set.copyOf(ids)));
        this.ingredientsByReason = Map.copyOf(byReason);
    }

    public boolean contains(Long ingredientId) {
        return ingredientsByReason.values().stream().anyMatch(ids -> ids.contains(ingredientId));
    }

    public List<IngredientAnalysisReason> reasonsOf(Long ingredientId) {
        return Arrays.stream(IngredientAnalysisReason.values())
            .filter(reason -> ingredientsByReason.getOrDefault(reason, Set.of()).contains(ingredientId))
            .toList();
    }
}
