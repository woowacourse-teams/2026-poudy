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
        Map<Long, Long> productCountsByChildCategoryId = Map
                .copyOf(Objects.requireNonNullElse(countsByCategoryId, Map.of()));
        validateProductCountsBelongToChildren(productCountsByChildCategoryId);

        Map<Long, Long> productCountsByCategoryId = new HashMap<>();
        for (Category parent : parents()) {
            List<Category> childCategories = childrenOf(parent);
            for (Category child : childCategories) {
                productCountsByCategoryId.put(
                        child.id(),
                        productCountsByChildCategoryId.getOrDefault(child.id(), 0L));
            }
            long parentProductCount = childCategories.stream()
                    .mapToLong(child -> productCountsByCategoryId.get(child.id()))
                    .sum();
            productCountsByCategoryId.put(parent.id(), parentProductCount);
        }
        return Map.copyOf(productCountsByCategoryId);
    }

    private void validateProductCountsBelongToChildren(Map<Long, Long> countsByCategoryId) {
        Set<Long> childCategoryIds = parents().stream()
                .flatMap(parent -> childrenOf(parent).stream())
                .map(Category::id)
                .collect(Collectors.toUnmodifiableSet());
        if (!childCategoryIds.containsAll(countsByCategoryId.keySet())) {
            throw new IllegalArgumentException("제품은 존재하는 소분류에 속해야 합니다.");
        }
    }
}
