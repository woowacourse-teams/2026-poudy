package com.poudy.product.domain;

import com.poudy.brand.domain.BrandProductCount;
import com.poudy.category.domain.CategoryProductCount;
import com.poudy.skintype.domain.SkinOptionProductCount;
import java.util.List;

public record ProductFilterOptions(
    List<BrandProductCount> brands,
    List<CategoryProductCount> categories,
    List<SkinOptionProductCount> skinOptions,
    List<MarkGroupOption> markGroups) {

    public ProductFilterOptions {
        brands = List.copyOf(brands);
        categories = List.copyOf(categories);
        skinOptions = List.copyOf(skinOptions);
        markGroups = List.copyOf(markGroups);
    }
}
