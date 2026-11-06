package com.poudy.shelf.domain;

import com.poudy.excludecode.domain.ExcludeCodes;
import java.util.Collection;
import java.util.List;

public final class IngredientAnalysis {

    private final int badProductCount;
    private final List<AnalyzedIngredient> items;

    private IngredientAnalysis(int badProductCount, List<AnalyzedIngredient> items) {
        this.badProductCount = badProductCount;
        this.items = List.copyOf(items);
    }

    public static IngredientAnalysis of(
        int badProductCount,
        SuspectIngredients suspects,
        AnalysisSnapshot snapshot,
        Collection<Long> filterIngredientIds,
        ExcludeCodes excludeCodes
    ) {
        List<AnalyzedIngredient> analyzedIngredients = suspects.items().stream()
            .map(
                suspect -> new AnalyzedIngredient(
                    suspect.ingredient(),
                    excludeCodes.codesOf(suspect.id()),
                    suspect.reasons(),
                    suspect.unsuitedProducts(),
                    filterIngredientIds.contains(suspect.id()),
                    snapshot.isNew(suspect.id())
                )
            )
            .toList();
        return new IngredientAnalysis(badProductCount, analyzedIngredients);
    }

    public int badProductCount() {
        return badProductCount;
    }

    public List<AnalyzedIngredient> items() {
        return items;
    }
}
