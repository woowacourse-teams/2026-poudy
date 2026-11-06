package com.poudy.shelf.domain;

import com.poudy.ingredient.domain.Ingredient;
import com.poudy.product.domain.Product;
import java.util.Comparator;
import java.util.List;

public final class SuspectIngredient {

    static final Comparator<SuspectIngredient> ORDER = Comparator
        .comparingDouble(SuspectIngredient::score).reversed()
        .thenComparingInt(suspect -> suspect.firstPosition)
        .thenComparing(SuspectIngredient::id);

    private static final double CAUTION_BONUS = 0.1;

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

    // 잘 맞은 제품에 든 성분은 피부 타입 보너스와 관계없이 숨긴다.
    public boolean isOffsetBySuitedProducts() {
        return evidence.isOffsetBySuitedProducts();
    }

    public double score() {
        if (reasons.stream().anyMatch(IngredientAnalysisReason::isSkinCaution)) {
            return evidence.baseScore() + CAUTION_BONUS;
        }
        return evidence.baseScore();
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
