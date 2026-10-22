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
    private final boolean caution;
    private final int firstPosition;

    public SuspectIngredient(
        Ingredient ingredient,
        List<Product> unsuitedProducts,
        SuspectEvidence evidence,
        boolean caution,
        int firstPosition
    ) {
        this.ingredient = ingredient;
        this.unsuitedProducts = List.copyOf(unsuitedProducts);
        this.evidence = evidence;
        this.caution = caution;
        this.firstPosition = firstPosition;
    }

    // 숨김은 사용자가 남긴 평가만으로 판정해, 피부 타입 보너스가 상쇄된 성분을 되살리지 않게 한다.
    public boolean isOffsetBySuitedProducts() {
        return evidence.isOffsetBySuitedProducts();
    }

    public double score() {
        if (caution) {
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
}
