package com.poudy.product.domain;

import com.poudy.excludecode.domain.ExcludeCode;
import com.poudy.search.domain.SearchKeyword;
import com.poudy.skintype.domain.SkinType;
import java.util.List;
import java.util.Objects;
import java.util.stream.Stream;

public final class ProductQuery {

    private static final double MAX_LEVEL = 3;
    private static final double LEVEL_STEP = 0.5;

    private final String keyword;
    private final List<Long> categoryIds;
    private final List<Long> brandIds;
    private final List<Double> moistureLevels;
    private final List<Double> oilLevels;
    private final List<Long> includeIngredientIds;
    private final List<Long> excludeIngredientIds;
    private final List<ExcludeCode> excludeCodes;
    private final List<String> includeGroupCodes;
    private final List<String> excludeGroupCodes;
    private final List<SkinType> skinTypes;
    private final boolean sensitiveSkin;
    private final List<Mark> marks;

    public ProductQuery(
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
        List<SkinType> skinTypes,
        boolean sensitiveSkin,
        List<Mark> marks
    ) {
        categoryIds = copyOf(categoryIds);
        brandIds = copyOf(brandIds);
        moistureLevels = copyOf(moistureLevels);
        oilLevels = copyOf(oilLevels);
        includeIngredientIds = copyOf(includeIngredientIds);
        excludeIngredientIds = copyOf(excludeIngredientIds);
        excludeCodes = copyOf(excludeCodes);
        includeGroupCodes = copyOf(includeGroupCodes);
        excludeGroupCodes = copyOf(excludeGroupCodes);
        skinTypes = copyOf(skinTypes);
        if (hasInvalidLevel(moistureLevels) || hasInvalidLevel(oilLevels)) {
            throw new InvalidSensoryFilterException();
        }
        List<Mark> selectedMarks = copyOf(marks).stream().distinct().toList();
        selectedMarks.forEach(MarkFilterGroup::requireFilterable);
        this.keyword = keyword;
        this.categoryIds = categoryIds;
        this.brandIds = brandIds;
        this.moistureLevels = moistureLevels;
        this.oilLevels = oilLevels;
        this.includeIngredientIds = includeIngredientIds;
        this.excludeIngredientIds = excludeIngredientIds;
        this.excludeCodes = excludeCodes;
        this.includeGroupCodes = includeGroupCodes;
        this.excludeGroupCodes = excludeGroupCodes;
        this.skinTypes = skinTypes;
        this.sensitiveSkin = sensitiveSkin;
        this.marks = selectedMarks;
    }

    private static boolean hasInvalidLevel(List<Double> levels) {
        return levels.stream().anyMatch(level -> level < 0 || level > MAX_LEVEL || level % LEVEL_STEP != 0);
    }

    public ProductQuery excludingMyFilterIngredients(List<Long> ingredientIds) {
        List<Long> excluded = Stream.concat(
            excludeIngredientIds.stream(),
            ingredientIds.stream().filter(id -> !includeIngredientIds.contains(id))
        ).distinct().toList();
        return new ProductQuery(
            keyword,
            categoryIds,
            brandIds,
            moistureLevels,
            oilLevels,
            includeIngredientIds,
            excluded,
            excludeCodes,
            includeGroupCodes,
            excludeGroupCodes,
            skinTypes,
            sensitiveSkin,
            marks
        );
    }

    public String keyword() {
        return keyword;
    }

    public List<Long> categoryIds() {
        return categoryIds;
    }

    public List<Long> brandIds() {
        return brandIds;
    }

    public List<Double> moistureLevels() {
        return moistureLevels;
    }

    public List<Double> oilLevels() {
        return oilLevels;
    }

    public List<Long> includeIngredientIds() {
        return includeIngredientIds;
    }

    public List<Long> excludeIngredientIds() {
        return excludeIngredientIds;
    }

    public List<String> includeGroupCodes() {
        return includeGroupCodes;
    }

    public List<SkinType> skinTypes() {
        return skinTypes;
    }

    public boolean sensitiveSkin() {
        return sensitiveSkin;
    }

    public List<Mark> marks() {
        return marks;
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
        return !categoryIds.isEmpty()
            || !brandIds.isEmpty()
            || !moistureLevels.isEmpty()
            || !oilLevels.isEmpty()
            || hasIncludeConditions()
            || hasExcludeConditions()
            || !skinTypes.isEmpty()
            || sensitiveSkin
            || !marks.isEmpty();
    }

    public boolean hasIncludeConditions() {
        return hasIncludedIngredients() || !includeGroupCodes.isEmpty();
    }

    public boolean hasIncludedIngredients() {
        return !includeIngredientIds.isEmpty();
    }

    public boolean hasExcludeConditions() {
        return !excludeIngredientIds.isEmpty() || !excludeCodes.isEmpty() || !excludeGroupCodes.isEmpty();
    }

    public List<String> groupCodes() {
        return Stream.concat(includeGroupCodes.stream(), excludeGroupCodes.stream()).distinct().toList();
    }

    public List<String> allExcludedCodes() {
        return Stream.concat(excludeCodes.stream().map(ExcludeCode::value), excludeGroupCodes.stream()).toList();
    }

    private static <T> List<T> copyOf(List<T> conditions) {
        return List.copyOf(Objects.requireNonNullElse(conditions, List.of()));
    }
}
