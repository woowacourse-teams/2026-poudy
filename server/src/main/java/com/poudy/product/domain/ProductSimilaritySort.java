package com.poudy.product.domain;

import java.util.List;

public enum ProductSimilaritySort {
    SIMILARITY,
    UNIT_PRICE_ASC;

    public List<SimilarProduct> apply(List<SimilarProduct> candidates, Product source) {
        if (this == SIMILARITY) {
            return List.copyOf(candidates);
        }
        UnitPrice base = source.representativeVariant().unitPrice();
        return candidates.stream()
            .sorted((left, right) -> left.unitPrice().compareAsAlternativeTo(right.unitPrice(), base))
            .toList();
    }
}
