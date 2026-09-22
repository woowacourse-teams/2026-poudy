package com.poudy.product.domain;

import com.poudy.excludecode.domain.ExcludeCodeIngredients;
import com.poudy.ingredient.domain.ExcludeCode;
import com.poudy.product.domain.sensory.MoistureLevel;
import com.poudy.product.domain.sensory.OilLevel;
import com.poudy.search.domain.SearchKeyword;
import com.poudy.skintype.domain.SkinType;
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
    List<ExcludeCode> excludeCodes,
    SkinType skinType) {

    public ProductQuery {
        categoryIds = copyOf(categoryIds);
        brandIds = copyOf(brandIds);
        moistureLevels = copyOf(moistureLevels);
        oilLevels = copyOf(oilLevels);
        includeIngredientIds = copyOf(includeIngredientIds);
        excludeIngredientIds = copyOf(excludeIngredientIds);
        excludeCodes = copyOf(excludeCodes);
    }

    public boolean hasKeyword() {
        return keyword != null;
    }

    public SearchKeyword searchKeyword() {
        if (!hasKeyword()) {
            return null;
        }
        return new SearchKeyword(keyword);
    }

    public boolean hasFilters() {
        return skinType != null
            || !categoryIds.isEmpty()
            || !brandIds.isEmpty()
            || !moistureLevels.isEmpty()
            || !oilLevels.isEmpty()
            || !includeIngredientIds.isEmpty()
            || !excludeIngredientIds.isEmpty()
            || !excludeCodes.isEmpty();
    }

    public ProductFilter toFilter(ExcludeCodeIngredients excludeCodeIngredients) {
        IngredientFilter ingredientFilter = IngredientFilter.of(
            includeIngredientIds,
            excludeIngredientIds,
            excludeCodeIngredients.idsOf(excludeCodes)
        );

        return new ProductFilter(
            searchKeyword(),
            categoryIds,
            brandIds,
            moistureLevels.stream().map(MoistureLevel::new).toList(),
            oilLevels.stream().map(OilLevel::new).toList(),
            ingredientFilter,
            skinType
        );
    }

    private static <T> List<T> copyOf(List<T> values) {
        return List.copyOf(Objects.requireNonNullElse(values, List.of()));
    }
}
