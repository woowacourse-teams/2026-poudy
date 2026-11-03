package com.poudy.product.domain;

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
    ProductPart selectedPart,
    List<SkinEffect> skinEffects,
    List<ProductComparisonCaution> cautionGroups,
    List<Ingredient> myFilterIngredients) {

    public ProductComparisonItem {
        skinEffects = List.copyOf(skinEffects);
        cautionGroups = List.copyOf(cautionGroups);
        myFilterIngredients = List.copyOf(myFilterIngredients);
    }

    public static ProductComparisonItem of(
        Product product,
        ProductPart part,
        ExcludeCodes excludeCodes,
        Collection<Long> myFilterIngredientIds
    ) {
        if (part == null) {
            return new ProductComparisonItem(product, null, List.of(), List.of(), List.of());
        }
        return new ProductComparisonItem(
            product,
            part,
            part.skinEffectGroups().stream().map(SkinEffectGroup::effect).toList(),
            excludeCodes.groups().stream().map(group -> cautionOf(group, part)).toList(),
            uniqueIngredients(UnsuitableIngredients.of(part, myFilterIngredientIds).values())
        );
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
