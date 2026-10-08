package com.poudy.ingredientgroup.domain;

import static java.util.stream.Collectors.counting;
import static java.util.stream.Collectors.groupingBy;
import static java.util.stream.Collectors.toMap;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

public final class IngredientGroupCatalog {

    private static final int MIN_BUNDLE_SIZE = 2;

    private final List<IngredientGroup> groups;

    public IngredientGroupCatalog(List<IngredientGroup> groups) {
        this.groups = List.copyOf(groups);
    }

    public static IngredientGroupCatalog empty() {
        return new IngredientGroupCatalog(List.of());
    }

    public List<IngredientBundle> bundle(List<Long> ingredientIds) {
        Map<Long, IngredientGroup> bundledGroups = bundledGroupsOf(ingredientIds);

        return ingredientIds.stream()
            .map(
                ingredientId -> Optional.ofNullable(bundledGroups.get(ingredientId))
                    .map(group -> new IngredientBundle(group, membersOf(group, bundledGroups, ingredientIds)))
                    .orElseGet(() -> new IngredientBundle(null, List.of(ingredientId)))
            )
            .distinct()
            .toList();
    }

    private Map<Long, IngredientGroup> bundledGroupsOf(List<Long> ingredientIds) {
        Map<Long, IngredientGroup> chosenGroups = ingredientIds.stream()
            .distinct()
            .flatMap(
                ingredientId -> groupFor(ingredientId, ingredientIds).map(group -> Map.entry(ingredientId, group))
                    .stream()
            )
            .collect(toMap(Map.Entry::getKey, Map.Entry::getValue));
        Map<String, Long> bundleSizes = chosenGroups.values().stream()
            .collect(groupingBy(IngredientGroup::code, counting()));

        return chosenGroups.entrySet().stream()
            .filter(entry -> bundleSizes.get(entry.getValue().code()) >= MIN_BUNDLE_SIZE)
            .collect(toMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    private List<Long> membersOf(
        IngredientGroup group,
        Map<Long, IngredientGroup> bundledGroups,
        List<Long> ingredientIds
    ) {
        return ingredientIds.stream()
            .filter(ingredientId -> Objects.equals(bundledGroups.get(ingredientId), group))
            .toList();
    }

    private Optional<IngredientGroup> groupFor(Long ingredientId, List<Long> ingredientIds) {
        return groups.stream()
            .filter(group -> group.contains(ingredientId))
            .filter(group -> group.countIn(ingredientIds) >= MIN_BUNDLE_SIZE)
            .max(
                Comparator.comparingLong((IngredientGroup group) -> group.countIn(ingredientIds))
                    .thenComparing(IngredientGroup::code, Comparator.reverseOrder())
            );
    }
}
