package com.poudy.brand.domain;

import com.poudy.category.domain.Category;
import com.poudy.category.domain.CategoryCounts;
import java.util.List;
import java.util.Objects;

public class BrandDetail {

    private final Brand brand;
    private final CategoryCounts categoryCounts;

    public BrandDetail(Brand brand, CategoryCounts categoryCounts) {
        this.brand = Objects.requireNonNull(brand);
        this.categoryCounts = Objects.requireNonNull(categoryCounts);
    }

    public Brand brand() {
        return brand;
    }

    public List<Category> categories() {
        return categoryCounts.parents().stream()
                .filter(category -> categoryCounts.productCountOf(category) > 0)
                .toList();
    }

    public List<Category> childrenOf(Category category) {
        return categoryCounts.childrenOf(category).stream()
                .filter(child -> categoryCounts.productCountOf(child) > 0)
                .toList();
    }

    public long productCountOf(Category category) {
        return categoryCounts.productCountOf(category);
    }
}
