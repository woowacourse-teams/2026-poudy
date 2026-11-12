package com.poudy.shelf.domain;

import java.util.List;

public final class ShelfRatingPreview {

    private final IngredientAnalysis withoutRating;
    private final IngredientAnalysis ratedGood;
    private final IngredientAnalysis ratedBad;
    private final List<CautionIngredient> productCautionIngredients;

    public ShelfRatingPreview(
        IngredientAnalysis withoutRating,
        IngredientAnalysis ratedGood,
        IngredientAnalysis ratedBad,
        List<CautionIngredient> productCautionIngredients
    ) {
        this.withoutRating = withoutRating;
        this.ratedGood = ratedGood;
        this.ratedBad = ratedBad;
        this.productCautionIngredients = List.copyOf(productCautionIngredients);
    }

    public IngredientAnalysis withoutRating() {
        return withoutRating;
    }

    public IngredientAnalysis ratedGood() {
        return ratedGood;
    }

    public IngredientAnalysis ratedBad() {
        return ratedBad;
    }

    public List<CautionIngredient> productCautionIngredients() {
        return productCautionIngredients;
    }
}
