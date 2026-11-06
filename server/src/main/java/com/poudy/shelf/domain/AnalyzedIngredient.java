package com.poudy.shelf.domain;

import com.poudy.excludecode.domain.ExcludeCode;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.product.domain.Product;
import com.poudy.tag.domain.FormulationRole;
import java.util.List;

public final class AnalyzedIngredient {

    private final Ingredient ingredient;
    private final List<ExcludeCode> groupCodes;
    private final List<IngredientAnalysisReason> reasons;
    private final List<Product> products;
    private final boolean inFilter;
    private final boolean newInSnapshot;

    public AnalyzedIngredient(
        Ingredient ingredient,
        List<ExcludeCode> groupCodes,
        List<IngredientAnalysisReason> reasons,
        List<Product> products,
        boolean inFilter,
        boolean newInSnapshot
    ) {
        this.ingredient = ingredient;
        this.groupCodes = List.copyOf(groupCodes);
        this.reasons = List.copyOf(reasons);
        this.products = List.copyOf(products);
        this.inFilter = inFilter;
        this.newInSnapshot = newInSnapshot;
    }

    public boolean isNew() {
        return newInSnapshot && !inFilter;
    }

    public Long id() {
        return ingredient.id();
    }

    public String koreanName() {
        return ingredient.koreanName();
    }

    public List<FormulationRole> formulationRoles() {
        return ingredient.formulationRoles();
    }

    public List<ExcludeCode> groupCodes() {
        return groupCodes;
    }

    public List<IngredientAnalysisReason> reasons() {
        return reasons;
    }

    public List<Product> products() {
        return products;
    }

    public boolean inFilter() {
        return inFilter;
    }
}
