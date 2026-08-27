package com.poudy.product.domain;

import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Predicate;

public class ProductCountsByCategory {

    private final Map<Long, Long> countsByCategoryId;

    ProductCountsByCategory(Map<Long, Long> countsByCategoryId) {
        this.countsByCategoryId = Map.copyOf(Objects.requireNonNullElse(countsByCategoryId, Map.of()));
    }

    public long countOf(Category category) {
        return countsByCategoryId.getOrDefault(category.id(), 0L);
    }

    public List<CategoryProductCount> categoriesOf(Categories categories) {
        return categoriesOf(categories, category -> true);
    }

    public List<CategoryProductCount> nonEmptyCategoriesOf(Categories categories) {
        return categoriesOf(categories, category -> countOf(category) > 0);
    }

    private List<CategoryProductCount> categoriesOf(
        Categories categories,
        Predicate<Category> included
    ) {
        return categories.parents().stream()
            .filter(included)
            .map(parent -> countedOf(parent, categories, included))
            .toList();
    }

    private CategoryProductCount countedOf(
        Category parent,
        Categories categories,
        Predicate<Category> included
    ) {
        List<CategoryProductCount> children = categories.childrenOf(parent).stream()
            .filter(included)
            .map(child -> new CategoryProductCount(child, countOf(child), List.of()))
            .toList();

        return new CategoryProductCount(parent, countOf(parent), children);
    }
}
