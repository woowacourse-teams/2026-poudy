package com.poudy.product.domain;

import com.poudy.product.domain.sensory.MoistureLevel;
import com.poudy.product.domain.sensory.OilLevel;
import java.util.List;

public record ProductFilter(
    String keyword,
    List<Long> categoryIds,
    List<Long> brandIds,
    List<MoistureLevel> moistureLevels,
    List<OilLevel> oilLevels,
    IngredientFilter ingredientFilter) {

    public ProductFilter {
        categoryIds = copyOf(categoryIds);
        brandIds = copyOf(brandIds);
        moistureLevels = copyOf(moistureLevels);
        oilLevels = copyOf(oilLevels);
        if (ingredientFilter == null) {
            ingredientFilter = new IngredientFilter(null, null);
        }
    }

    public boolean hasKeyword() {
        return keyword != null;
    }

    private static <T> List<T> copyOf(List<T> values) {
        if (values == null) {
            return List.of();
        }

        return List.copyOf(values);
    }
}
