package com.poudy.brand.domain;

import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import com.poudy.product.domain.ProductCountsByCategory;
import java.util.List;
import java.util.Objects;

public class BrandDetail {

    private final Brand brand;
    private final Categories categories;
    private final ProductCountsByCategory productCounts;

    public BrandDetail(Brand brand, Categories categories, ProductCountsByCategory productCounts) {
        this.brand = Objects.requireNonNull(brand);
        this.categories = Objects.requireNonNull(categories);
        this.productCounts = Objects.requireNonNull(productCounts);
    }

    public Brand brand() {
        return brand;
    }

    public List<Category> categories() {
        return categories.parents().stream()
                .filter(category -> productCounts.countOf(category) > 0)
                .toList();
    }

    public List<Category> childrenOf(Category category) {
        return categories.childrenOf(category).stream()
                .filter(child -> productCounts.countOf(child) > 0)
                .toList();
    }

    public long productCountOf(Category category) {
        return productCounts.countOf(category);
    }
}
