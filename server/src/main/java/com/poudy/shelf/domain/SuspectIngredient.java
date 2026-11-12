package com.poudy.shelf.domain;

import com.poudy.ingredient.domain.Ingredient;
import com.poudy.product.domain.Product;
import java.util.Comparator;
import java.util.List;

public final class SuspectIngredient {

    static final Comparator<SuspectIngredient> ORDER = Comparator
        .comparingDouble(SuspectIngredient::score).reversed()
        .thenComparing(SuspectIngredient::isSkinCaution, Comparator.reverseOrder())
        .thenComparingInt(suspect -> suspect.firstPosition)
        .thenComparing(SuspectIngredient::id);

    private final Ingredient ingredient;
    private final List<Product> unsuitedProducts;
    private final SuspectEvidence evidence;
    private final List<IngredientAnalysisReason> reasons;
    private final int firstPosition;

    public SuspectIngredient(
        Ingredient ingredient,
        List<Product> unsuitedProducts,
        SuspectEvidence evidence,
        List<IngredientAnalysisReason> reasons,
        int firstPosition
    ) {
        this.ingredient = ingredient;
        this.unsuitedProducts = List.copyOf(unsuitedProducts);
        this.evidence = evidence;
        this.reasons = List.copyOf(reasons);
        this.firstPosition = firstPosition;
    }

    public boolean isOffsetBySuitedProducts() {
        return evidence.isOffsetBySuitedProducts();
    }

    public double score() {
        return evidence.baseScore();
    }

    public boolean isSkinCaution() {
        return reasons.stream().anyMatch(IngredientAnalysisReason::isSkinCaution);
    }

    public Long id() {
        return ingredient.id();
    }

    public Ingredient ingredient() {
        return ingredient;
    }

    public List<Product> unsuitedProducts() {
        return unsuitedProducts;
    }

    public List<IngredientAnalysisReason> reasons() {
        return reasons;
    }
}
