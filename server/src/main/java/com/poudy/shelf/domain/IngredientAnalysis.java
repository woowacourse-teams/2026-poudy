package com.poudy.shelf.domain;

import com.poudy.excludecode.domain.ExcludeCodes;
import java.util.Collection;
import java.util.List;

public record IngredientAnalysis(int badProductCount, List<AnalyzedIngredient> items) {

    // 필터에 넣은 성분은 새 성분 표시를 바로 끈다.
    public static IngredientAnalysis of(
        Shelf shelf,
        AnalysisSnapshot snapshot,
        Collection<Long> filterIngredientIds,
        ExcludeCodes excludeCodes
    ) {
        return new IngredientAnalysis(
            shelf.ratedBad().size(),
            shelf.suspectIngredients().items().stream()
                .map(suspect -> {
                    boolean inFilter = filterIngredientIds.contains(suspect.id());
                    return new AnalyzedIngredient(
                        suspect.ingredient(),
                        excludeCodes.codesOf(suspect.id()),
                        suspect.unsuitedProducts(),
                        inFilter,
                        snapshot.isNew(suspect.id()) && !inFilter
                    );
                })
                .toList()
        );
    }
}
