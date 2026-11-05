package com.poudy.product.domain;

import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import com.poudy.excludecode.domain.ExcludeCodeGroup;
import com.poudy.excludecode.domain.ExcludeCodes;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.tag.domain.SkinEffect;
import java.util.Collection;
import java.util.List;

public final class ProductComparisonItem {

    private final Product product;
    private final List<Category> categoryPath;
    private final ProductPart selectedPart;
    private final List<SkinEffect> skinEffects;
    private final List<ProductComparisonCaution> cautionGroups;
    private final ProductComparisonFilterStatus myFilterStatus;
    private final List<Ingredient> myFilterIngredients;

    private ProductComparisonItem(
        Product product,
        List<Category> categoryPath,
        ProductPart selectedPart,
        List<SkinEffect> skinEffects,
        List<ProductComparisonCaution> cautionGroups,
        ProductComparisonFilterStatus myFilterStatus,
        List<Ingredient> myFilterIngredients
    ) {
        this.product = product;
        this.categoryPath = categoryPath;
        this.selectedPart = selectedPart;
        this.skinEffects = skinEffects;
        this.cautionGroups = cautionGroups;
        this.myFilterStatus = myFilterStatus;
        this.myFilterIngredients = myFilterIngredients;
    }

    public static ProductComparisonItem of(
        Product product,
        ProductPart part,
        Categories categories,
        ExcludeCodes excludeCodes,
        boolean loggedIn,
        Collection<Long> myFilterIngredientIds
    ) {
        List<Category> categoryPath = categories.pathOf(product.category());
        if (part == null) {
            return new ProductComparisonItem(
                product,
                categoryPath,
                null,
                List.of(),
                List.of(),
                null,
                List.of()
            );
        }
        Ingredients filteredIngredients = new Ingredients(part.ingredientsIn(myFilterIngredientIds));
        List<Ingredient> matchedIngredients = filteredIngredients.unique().values();
        List<SkinEffect> skinEffects = part.skinEffectGroups().stream().map(SkinEffectGroup::effect).toList();
        List<ProductComparisonCaution> cautionGroups = excludeCodes.groups().stream()
            .map(group -> cautionOf(group, part)).toList();
        ProductComparisonFilterStatus myFilterStatus = filterStatus(
            loggedIn,
            myFilterIngredientIds,
            matchedIngredients
        );
        return new ProductComparisonItem(
            product,
            categoryPath,
            part,
            skinEffects,
            cautionGroups,
            myFilterStatus,
            matchedIngredients
        );
    }

    public Product product() {
        return product;
    }

    public List<Category> categoryPath() {
        return categoryPath;
    }

    public ProductPart selectedPart() {
        return selectedPart;
    }

    public List<SkinEffect> skinEffects() {
        return skinEffects;
    }

    public List<ProductComparisonCaution> cautionGroups() {
        return cautionGroups;
    }

    public ProductComparisonFilterStatus myFilterStatus() {
        return myFilterStatus;
    }

    public List<Ingredient> myFilterIngredients() {
        return myFilterIngredients;
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
        Ingredients cautionIngredients = new Ingredients(part.ingredientsIn(group));
        return new ProductComparisonCaution(
            group.code(),
            group.displayName(),
            cautionIngredients.unique().values()
        );
    }
}
