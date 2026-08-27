package com.poudy.product.service;

import com.poudy.excludecode.domain.ExcludeCode;
import java.util.List;
import java.util.Objects;

public record ProductQuery(
    String keyword,
    List<Long> categoryIds,
    List<Long> brandIds,
    List<Integer> moistureLevels,
    List<Integer> oilLevels,
    List<Long> includeIngredientIds,
    List<Long> excludeIngredientIds,
    List<ExcludeCode> excludeCodes) {

    public ProductQuery {
        categoryIds = copyOf(categoryIds);
        brandIds = copyOf(brandIds);
        moistureLevels = copyOf(moistureLevels);
        oilLevels = copyOf(oilLevels);
        includeIngredientIds = copyOf(includeIngredientIds);
        excludeIngredientIds = copyOf(excludeIngredientIds);
        excludeCodes = copyOf(excludeCodes);
    }

    private static <T> List<T> copyOf(List<T> values) {
        return List.copyOf(Objects.requireNonNullElse(values, List.of()));
    }
}
