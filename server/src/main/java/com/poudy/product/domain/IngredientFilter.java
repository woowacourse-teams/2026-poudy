package com.poudy.product.domain;

import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Stream;

public record IngredientFilter(List<Long> includedIds, List<Long> excludedIds) {

    public IngredientFilter {
        includedIds = List.copyOf(Objects.requireNonNullElse(includedIds, List.of()));
        excludedIds = List.copyOf(Objects.requireNonNullElse(excludedIds, List.of()));

        if (includedIds.stream()
                .anyMatch(excludedIds::contains)) {
            throw new ConflictingIngredientFilterException();
        }
    }

    public static IngredientFilter of(
            List<Long> includedIds,
            List<Long> excludedIds,
            Collection<Long> excludedCodeIngredientIds) {
        List<Long> resolved = Stream.concat(
                Objects.requireNonNullElse(excludedIds, List.<Long>of()).stream(),
                Objects.requireNonNullElse(excludedCodeIngredientIds, Set.<Long>of()).stream())
                .distinct()
                .toList();

        return new IngredientFilter(includedIds, resolved);
    }
}
