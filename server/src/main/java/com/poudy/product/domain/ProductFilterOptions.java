package com.poudy.product.domain;

import com.poudy.brand.domain.Brand;
import com.poudy.category.domain.CategoryProductCount;
import com.poudy.skintype.domain.SkinChoice;
import java.util.List;

public record ProductFilterOptions(
    List<Brand> brands,
    List<CategoryProductCount> categories,
    List<SkinChoice> skinChoices,
    List<MarkGroupOption> markGroups) {

    public ProductFilterOptions {
        brands = List.copyOf(brands);
        categories = List.copyOf(categories);
        skinChoices = List.copyOf(skinChoices);
        markGroups = List.copyOf(markGroups);
    }
}
