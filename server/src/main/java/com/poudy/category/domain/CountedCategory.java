package com.poudy.category.domain;

import java.util.List;
import java.util.Objects;

public class CountedCategory {

    private final Category category;
    private final long productCount;
    private final List<CountedCategory> children;

    public CountedCategory(Category category, long productCount, List<CountedCategory> children) {
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

    public List<CountedCategory> children() {
        return children;
    }
}
