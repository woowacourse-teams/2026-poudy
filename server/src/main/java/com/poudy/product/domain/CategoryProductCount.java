package com.poudy.product.domain;

import com.poudy.category.domain.Category;
import java.util.List;
import java.util.Objects;

public class CategoryProductCount {

    private final Category category;
    private final long productCount;
    private final List<CategoryProductCount> children;

    public CategoryProductCount(Category category, long productCount, List<CategoryProductCount> children) {
        this.category = Objects.requireNonNull(category);
        this.productCount = productCount;
        this.children = List.copyOf(Objects.requireNonNullElse(children, List.of()));
    }

    public Long id() {
        return category.id();
    }

    public String name() {
        return category.name();
    }

    public long productCount() {
        return productCount;
    }

    public List<CategoryProductCount> children() {
        return children;
    }
}
