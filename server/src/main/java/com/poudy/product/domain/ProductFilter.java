package com.poudy.product.domain;

import com.poudy.product.domain.sensory.MoistureLevel;
import com.poudy.product.domain.sensory.OilLevel;
import java.util.List;

public final class ProductFilter {

    private final String keyword;
    private final List<Long> categoryIds;
    private final List<Long> brandIds;
    private final List<MoistureLevel> moistureLevels;
    private final List<OilLevel> oilLevels;
    private final IngredientFilter ingredientFilter;

    public ProductFilter(
        String keyword,
        List<Long> categoryIds,
        List<Long> brandIds,
        List<MoistureLevel> moistureLevels,
        List<OilLevel> oilLevels,
        IngredientFilter ingredientFilter
    ) {
        this.keyword = keyword;
        this.categoryIds = copyOf(categoryIds);
        this.brandIds = copyOf(brandIds);
        this.moistureLevels = copyOf(moistureLevels);
        this.oilLevels = copyOf(oilLevels);
        this.ingredientFilter = ingredientFilter == null ? new IngredientFilter(null, null) : ingredientFilter;
    }

    String keyword() {
        return keyword;
    }

    boolean matches(Product product) {
        return product.belongsToAnyCategory(categoryIds)
            && product.belongsToAnyBrand(brandIds)
            && product.hasAnyMoistureLevel(moistureLevels)
            && product.hasAnyOilLevel(oilLevels)
            && product.matchesIngredients(ingredientFilter);
    }

    boolean hasKeyword() {
        return keyword != null;
    }

    private static <T> List<T> copyOf(List<T> values) {
        if (values == null) {
            return List.of();
        }

        return List.copyOf(values);
    }
}
