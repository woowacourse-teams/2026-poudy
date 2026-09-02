package com.poudy.product.domain;

import com.poudy.ingredient.domain.Ingredients;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Stream;

public final class IngredientFilter {

    private final List<Long> includedIds;
    private final List<Long> excludedIds;

    public IngredientFilter(List<Long> includedIds, List<Long> excludedIds) {
        this.includedIds = List.copyOf(Objects.requireNonNullElse(includedIds, List.of()));
        this.excludedIds = List.copyOf(Objects.requireNonNullElse(excludedIds, List.of()));

        if (this.includedIds.stream()
            .anyMatch(this.excludedIds::contains)) {
            throw new ConflictingIngredientFilterException();
        }
    }

    public static IngredientFilter of(
        List<Long> includedIds,
        List<Long> excludedIds,
        Collection<Long> excludedCodeIngredientIds
    ) {
        List<Long> resolved = Stream.concat(
            Objects.requireNonNullElse(excludedIds, List.<Long>of()).stream(),
            Objects.requireNonNullElse(excludedCodeIngredientIds, Set.<Long>of()).stream()
        )
            .distinct()
            .toList();

        return new IngredientFilter(includedIds, resolved);
    }

    public List<Long> includedIds() {
        return includedIds;
    }

    public List<Long> excludedIds() {
        return excludedIds;
    }

    public boolean matches(Ingredients ingredients) {
        return ingredients.containsAll(includedIds) && !ingredients.containsAny(excludedIds);
    }
}
