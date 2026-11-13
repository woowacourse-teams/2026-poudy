package com.poudy.shelf.domain;

import com.poudy.product.domain.Product;
import java.util.List;

public final class SuspectIngredients {

    private final List<SuspectIngredient> items;

    private SuspectIngredients(List<SuspectIngredient> items) {
        this.items = List.copyOf(items);
    }

    public static SuspectIngredients from(List<SuspectIngredient> suspects) {
        List<SuspectIngredient> remainingSuspects = suspects.stream()
            .filter(suspect -> !suspect.isOffsetBySuitedProducts())
            .toList();
        boolean hasStrongSuspect = remainingSuspects.stream().anyMatch(suspect -> !suspect.isWeakEvidenceOnly());
        List<SuspectIngredient> rankedSuspects = remainingSuspects.stream()
            .filter(suspect -> !hasStrongSuspect || !suspect.isWeakEvidenceOnly())
            .sorted(SuspectIngredient.ORDER)
            .toList();
        return new SuspectIngredients(rankedSuspects);
    }

    public AnalysisSnapshot nextSnapshot(AnalysisSnapshot snapshot) {
        return snapshot.next(ingredientIds());
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
