package com.poudy.product.domain;

import java.util.List;

public enum ProductSimilaritySort {
    SIMILARITY,
    UNIT_PRICE_ASC;

    public List<SimilarProduct> apply(List<SimilarProduct> candidates, Product source) {
        if (this == SIMILARITY) {
            return List.copyOf(candidates);
        }
        UnitPrice base = source.unitPrice();
        return candidates.stream()
            .sorted((left, right) -> left.compareUnitPriceTo(right, base))
            .toList();
    }
}
