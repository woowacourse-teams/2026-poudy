package com.poudy.shelf.domain;

import java.util.List;
import java.util.Optional;

public final class ShelfRatingPreview {

    private final IngredientAnalysis withoutRating;
    private final IngredientAnalysis ratedGood;
    private final IngredientAnalysis ratedBad;
    private final IngredientAnalysis ratedBadAcrossSkinTypes;
    private final List<CautionIngredient> productCautionIngredients;

    public ShelfRatingPreview(
        IngredientAnalysis withoutRating,
        IngredientAnalysis ratedGood,
        IngredientAnalysis ratedBad,
        IngredientAnalysis ratedBadAcrossSkinTypes,
        List<CautionIngredient> productCautionIngredients
    ) {
        this.withoutRating = withoutRating;
        this.ratedGood = ratedGood;
        this.ratedBad = ratedBad;
        this.ratedBadAcrossSkinTypes = ratedBadAcrossSkinTypes;
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

    public Optional<IngredientAnalysis> ratedBadAcrossSkinTypes() {
        return Optional.ofNullable(ratedBadAcrossSkinTypes);
    }

    public List<CautionIngredient> productCautionIngredients() {
        return productCautionIngredients;
    }
}
