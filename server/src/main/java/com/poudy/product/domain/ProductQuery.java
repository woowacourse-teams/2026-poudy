package com.poudy.product.domain;

import com.poudy.excludecode.domain.ExcludeCode;
import com.poudy.search.domain.SearchKeyword;
import com.poudy.skintype.domain.SkinType;
import java.util.List;
import java.util.Objects;
import java.util.stream.Stream;

public record ProductQuery(
    String keyword,
    List<Long> categoryIds,
    List<Long> brandIds,
    List<Integer> moistureLevels,
    List<Integer> oilLevels,
    List<Long> includeIngredientIds,
    List<Long> excludeIngredientIds,
    List<ExcludeCode> excludeCodes,
    List<String> includeGroupCodes,
    List<String> excludeGroupCodes,
    SkinType skinType) {

    public ProductQuery {
        categoryIds = copyOf(categoryIds);
        brandIds = copyOf(brandIds);
        moistureLevels = copyOf(moistureLevels);
        oilLevels = copyOf(oilLevels);
        includeIngredientIds = copyOf(includeIngredientIds);
        excludeIngredientIds = copyOf(excludeIngredientIds);
        excludeCodes = copyOf(excludeCodes);
        includeGroupCodes = copyOf(includeGroupCodes);
        excludeGroupCodes = copyOf(excludeGroupCodes);
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
            || !excludeCodes.isEmpty()
            || !includeGroupCodes.isEmpty()
            || !excludeGroupCodes.isEmpty();
    }

    public boolean hasIncludeConditions() {
        return !includeIngredientIds.isEmpty() || !includeGroupCodes.isEmpty();
    }

    public List<String> groupCodes() {
        return Stream.concat(includeGroupCodes.stream(), excludeGroupCodes.stream()).distinct().toList();
    }

    public List<String> allExcludedCodes() {
        return Stream.concat(excludeCodes.stream().map(ExcludeCode::value), excludeGroupCodes.stream()).toList();
    }

    private static <T> List<T> copyOf(List<T> values) {
        return List.copyOf(Objects.requireNonNullElse(values, List.of()));
    }
}
