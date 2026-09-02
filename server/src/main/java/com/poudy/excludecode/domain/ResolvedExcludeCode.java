package com.poudy.excludecode.domain;

import com.poudy.ingredient.domain.IngredientCatalog;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

public record ResolvedExcludeCode(ExcludeCode code, List<ExcludeCodeIngredient> found, List<Long> missing) {

    public ResolvedExcludeCode {
        found = List.copyOf(found);
        missing = List.copyOf(missing);
    }

    public static ResolvedExcludeCode of(ExcludeCodeMapping mapping, IngredientCatalog ingredients) {
        List<ExcludeCodeIngredient> found = new ArrayList<>();
        List<Long> missing = new ArrayList<>();

        for (Long ingredientId : mapping.ingredientIds()) {
            ingredients.findById(ingredientId)
                .map(ExcludeCodeIngredient::from)
                .ifPresentOrElse(found::add, () -> missing.add(ingredientId));
        }

        return new ResolvedExcludeCode(mapping.code(), found, missing);
    }

    public Stream<String> missingReferences() {
        return missing.stream()
            .map(ingredientId -> code + " 의 성분 ID " + ingredientId);
    }
}
