package com.poudy.product.domain;

import com.poudy.category.domain.Category;
import java.util.Map;
import java.util.Objects;

public class ProductCountsByCategory {

    private final Map<Long, Long> countsByCategoryId;

    ProductCountsByCategory(Map<Long, Long> countsByCategoryId) {
        this.countsByCategoryId = Map.copyOf(Objects.requireNonNullElse(countsByCategoryId, Map.of()));
    }

    public long countOf(Category category) {
        return countsByCategoryId.getOrDefault(category.id(), 0L);
    }
}
