package com.poudy.product.domain;

import com.poudy.brand.domain.Brand;
import com.poudy.category.domain.CategoryProductCount;
import com.poudy.skintype.domain.SkinType;
import java.util.List;

public record ProductPage(
    List<Product> items,
    long totalElements,
    List<Brand> brands,
    List<CategoryProductCount> categories,
    List<SkinType> skinTypes,
    ProductFilterOptions filterOptions) {

    public ProductPage {
        items = List.copyOf(items);
        brands = List.copyOf(brands);
        categories = List.copyOf(categories);
        skinTypes = List.copyOf(skinTypes);
    }
}
