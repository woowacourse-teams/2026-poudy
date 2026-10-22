package com.poudy.shelf.domain;

import java.util.Set;

public final class SuspectCandidates {

    private final Set<Long> excludeCodeIngredientIds;
    private final Set<Long> cautionIngredientIds;

    public SuspectCandidates(Set<Long> excludeCodeIngredientIds, Set<Long> cautionIngredientIds) {
        this.excludeCodeIngredientIds = Set.copyOf(excludeCodeIngredientIds);
        this.cautionIngredientIds = Set.copyOf(cautionIngredientIds);
    }

    public boolean contains(Long ingredientId) {
        return excludeCodeIngredientIds.contains(ingredientId) || isCaution(ingredientId);
    }

    public boolean isCaution(Long ingredientId) {
        return cautionIngredientIds.contains(ingredientId);
    }
}
