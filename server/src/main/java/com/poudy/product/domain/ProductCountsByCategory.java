package com.poudy.product.domain;

import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import com.poudy.category.domain.CountedCategory;
import java.util.List;
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

    public List<CountedCategory> nonEmptyCategoriesOf(Categories categories) {
        return categories.parents().stream()
                .filter(parent -> countOf(parent) > 0)
                .map(parent -> countedOf(parent, categories))
                .toList();
    }

    private CountedCategory countedOf(Category parent, Categories categories) {
        List<CountedCategory> children = categories.childrenOf(parent).stream()
                .filter(child -> countOf(child) > 0)
                .map(child -> new CountedCategory(child, countOf(child), List.of()))
                .toList();

        return new CountedCategory(parent, countOf(parent), children);
    }
}
