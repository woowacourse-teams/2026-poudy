package com.poudy.product.domain;

import com.poudy.brand.domain.Brand;
import com.poudy.skintype.domain.SkinType;
import java.util.List;

public record ProductFilterOptions(
    List<Brand> brands,
    List<CategoryProductCount> categories,
    List<SkinType> skinTypes) {

    public ProductFilterOptions {
        brands = List.copyOf(brands);
        categories = List.copyOf(categories);
        skinTypes = List.copyOf(skinTypes);
    }
}
