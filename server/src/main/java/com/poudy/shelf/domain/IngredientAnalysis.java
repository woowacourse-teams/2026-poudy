package com.poudy.shelf.domain;

import java.util.List;

public record IngredientAnalysis(int badProductCount, List<AnalyzedIngredient> items) {
}
