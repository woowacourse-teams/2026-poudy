package com.poudy.product.domain;

import java.util.List;

public record MyFilteredSimilarProduct(
    Long productId,
    boolean containsMyFilterIngredient,
    List<SharedIngredientGroup> sharedIngredientGroups) {
    public MyFilteredSimilarProduct {
        sharedIngredientGroups = List.copyOf(sharedIngredientGroups);
    }
}
