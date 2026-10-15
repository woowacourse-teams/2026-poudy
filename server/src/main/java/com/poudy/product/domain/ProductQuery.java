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
    List<Double> moistureLevels,
    List<Double> oilLevels,
    List<Long> includeIngredientIds,
    List<Long> excludeIngredientIds,
    List<ExcludeCode> excludeCodes,
    List<String> includeGroupCodes,
    List<String> excludeGroupCodes,
    SkinType skinType,
    boolean sensitiveSkin) {

    private static final double MAX_LEVEL = 3;
    private static final double LEVEL_STEP = 0.5;

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
        if (hasInvalidLevel(moistureLevels) || hasInvalidLevel(oilLevels)) {
            throw new InvalidSensoryFilterException();
        }
    }

    private static boolean hasInvalidLevel(List<Double> levels) {
        return levels.stream().anyMatch(level -> level < 0 || level > MAX_LEVEL || level % LEVEL_STEP != 0);
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
            || sensitiveSkin
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
