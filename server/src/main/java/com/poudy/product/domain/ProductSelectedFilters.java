package com.poudy.product.domain;

import com.poudy.brand.domain.Brand;
import com.poudy.category.domain.Category;
import java.util.List;

public record ProductSelectedFilters(List<Brand> brands, List<Category> categories) {

    public ProductSelectedFilters {
        brands = List.copyOf(brands);
        categories = List.copyOf(categories);
    }
}
