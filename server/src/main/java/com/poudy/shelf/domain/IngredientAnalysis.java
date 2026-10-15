package com.poudy.shelf.domain;

import java.util.Collection;
import java.util.List;

public record IngredientAnalysis(int badProductCount, List<AnalyzedIngredient> items) {

    public static IngredientAnalysis of(Shelf shelf, Collection<Long> filterIngredientIds) {
        return new IngredientAnalysis(
            shelf.ratedBad().size(),
            shelf.suspectIngredients().items().stream()
                .map(
                    suspect -> new AnalyzedIngredient(
                        suspect.ingredient(),
                        suspect.unsuitedProducts(),
                        filterIngredientIds.contains(suspect.id()),
                        false
                    )
                )
                .toList()
        );
    }
}
