package com.poudy.category.domain;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

public class CategoryCounts {

    private final Categories categories;
    private final Map<Long, Long> productCounts;

    public CategoryCounts(Categories categories, Map<Long, Long> countsByCategoryId) {
        this.categories = Objects.requireNonNull(categories);
        this.productCounts = aggregateProductCounts(countsByCategoryId);
    }

    public List<Category> parents() {
        return categories.parents();
    }

    public List<Category> childrenOf(Category parent) {
        return categories.childrenOf(parent);
    }

    public long productCountOf(Category category) {
        return productCounts.getOrDefault(category.id(), 0L);
    }

    private Map<Long, Long> aggregateProductCounts(Map<Long, Long> countsByCategoryId) {
        Map<Long, Long> childCounts = Map.copyOf(Objects.requireNonNullElse(countsByCategoryId, Map.of()));
        validateProductCountsBelongToChildren(childCounts);

        Map<Long, Long> aggregatedCounts = new HashMap<>();
        for (Category parent : parents()) {
            List<Category> children = childrenOf(parent);
            for (Category child : children) {
                aggregatedCounts.put(child.id(), childCounts.getOrDefault(child.id(), 0L));
            }
            long parentCount = children.stream().mapToLong(child -> aggregatedCounts.get(child.id())).sum();
            aggregatedCounts.put(parent.id(), parentCount);
        }
        return Map.copyOf(aggregatedCounts);
    }

    private void validateProductCountsBelongToChildren(Map<Long, Long> countsByCategoryId) {
        // spotless:off
        Set<Long> childIds = parents().stream()
                .flatMap(parent -> childrenOf(parent).stream())
                .map(Category::id)
                .collect(Collectors.toUnmodifiableSet());
        // spotless:on
        if (!childIds.containsAll(countsByCategoryId.keySet())) {
            throw new IllegalArgumentException("제품은 존재하는 소분류에 속해야 합니다.");
        }
    }
}
