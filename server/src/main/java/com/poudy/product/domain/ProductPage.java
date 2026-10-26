package com.poudy.product.domain;

import com.poudy.category.domain.CategoryProductCount;
import com.poudy.skintype.domain.SkinType;
import java.util.List;

public record ProductPage(
    List<ProductCard> items,
    long totalElements,
    List<CategoryProductCount> categories,
    List<SkinType> skinTypes,
    ProductFilterOptions filterOptions) {

    public ProductPage {
        items = List.copyOf(items);
        categories = List.copyOf(categories);
        skinTypes = List.copyOf(skinTypes);
    }
}
