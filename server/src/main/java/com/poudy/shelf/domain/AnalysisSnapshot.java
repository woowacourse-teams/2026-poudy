package com.poudy.shelf.domain;

import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

public final class AnalysisSnapshot {

    private final Map<Long, Boolean> newByIngredientId;

    public AnalysisSnapshot(Map<Long, Boolean> newByIngredientId) {
        this.newByIngredientId = Map.copyOf(newByIngredientId);
    }

    public static AnalysisSnapshot empty() {
        return new AnalysisSnapshot(Map.of());
    }

    // 직전 결과에 없던 성분이 새 성분이다. 직전 결과가 비어 있으면 모든 성분이 새 성분이 된다.
    public Optional<AnalysisSnapshot> nextIfChanged(Collection<Long> ingredientIds) {
        Set<Long> analyzedIngredientIds = Set.copyOf(ingredientIds);
        if (newByIngredientId.keySet().equals(analyzedIngredientIds)) {
            return Optional.empty();
        }
        return Optional.of(
            new AnalysisSnapshot(
                analyzedIngredientIds.stream()
                    .collect(Collectors.toMap(Function.identity(), id -> !newByIngredientId.containsKey(id)))
            )
        );
    }

    public boolean isNew(Long ingredientId) {
        return newByIngredientId.getOrDefault(ingredientId, false);
    }

    public Map<Long, Boolean> newByIngredientId() {
        return newByIngredientId;
    }
}
