package com.poudy.product.domain;

import com.poudy.brand.domain.BrandProductCount;
import com.poudy.category.domain.CategoryProductCount;
import com.poudy.skintype.domain.SkinTypeProductCount;
import java.util.List;

public record ProductFilterOptions(
    List<BrandProductCount> brands,
    List<CategoryProductCount> categories,
    List<SkinTypeProductCount> skinTypes,
    Long sensitiveSkinCount,
    List<MarkGroupOption> markGroups) {

    public ProductFilterOptions {
        brands = List.copyOf(brands);
        categories = List.copyOf(categories);
        skinTypes = List.copyOf(skinTypes);
        markGroups = List.copyOf(markGroups);
    }
}
