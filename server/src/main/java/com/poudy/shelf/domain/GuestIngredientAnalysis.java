package com.poudy.shelf.domain;

import java.util.List;

public record GuestIngredientAnalysis(IngredientAnalysis analysis, List<Long> possiblyUnsuitableProductIds) {
}
