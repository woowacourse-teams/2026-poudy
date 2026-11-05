package com.poudy.product.domain;

import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import com.poudy.excludecode.domain.ExcludeCodeGroup;
import com.poudy.excludecode.domain.ExcludeCodes;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.tag.domain.SkinEffect;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public record ProductComparisonItem(
    Product product,
    List<Category> categoryPath,
    ProductPart selectedPart,
    List<SkinEffect> skinEffects,
    List<ProductComparisonCaution> cautionGroups,
    ProductComparisonFilterStatus myFilterStatus,
    List<Ingredient> myFilterIngredients) {

    public ProductComparisonItem {
        categoryPath = List.copyOf(categoryPath);
        skinEffects = List.copyOf(skinEffects);
        cautionGroups = List.copyOf(cautionGroups);
        myFilterIngredients = List.copyOf(myFilterIngredients);
    }

    public static ProductComparisonItem of(
        Product product,
        ProductPart part,
        Categories categories,
        ExcludeCodes excludeCodes,
        boolean loggedIn,
        Collection<Long> myFilterIngredientIds
    ) {
        if (part == null) {
            return new ProductComparisonItem(
                product,
                categories.pathOf(product.category()),
                null,
                List.of(),
                List.of(),
                null,
                List.of()
            );
        }
        List<Ingredient> matchedIngredients = uniqueIngredients(
            UnsuitableIngredients.of(part, myFilterIngredientIds).values()
        );
        return new ProductComparisonItem(
            product,
            categories.pathOf(product.category()),
            part,
            part.skinEffectGroups().stream().map(SkinEffectGroup::effect).toList(),
            excludeCodes.groups().stream().map(group -> cautionOf(group, part)).toList(),
            filterStatus(loggedIn, myFilterIngredientIds, matchedIngredients),
            matchedIngredients
        );
    }

    private static ProductComparisonFilterStatus filterStatus(
        boolean loggedIn,
        Collection<Long> filterIngredientIds,
        List<Ingredient> matchedIngredients
    ) {
        if (!loggedIn) {
            return ProductComparisonFilterStatus.GUEST;
        }
        if (filterIngredientIds.isEmpty()) {
            return ProductComparisonFilterStatus.NO_FILTER;
        }
        if (matchedIngredients.isEmpty()) {
            return ProductComparisonFilterStatus.NO_MATCH;
        }
        return ProductComparisonFilterStatus.MATCH;
    }

    private static ProductComparisonCaution cautionOf(ExcludeCodeGroup group, ProductPart part) {
        return new ProductComparisonCaution(
            group.code(),
            group.displayName(),
            uniqueIngredients(part.ingredientsIn(group))
        );
    }

    private static List<Ingredient> uniqueIngredients(List<Ingredient> ingredients) {
        Map<Long, Ingredient> unique = new LinkedHashMap<>();
        ingredients.forEach(ingredient -> unique.putIfAbsent(ingredient.id(), ingredient));
        return List.copyOf(unique.values());
    }
}
