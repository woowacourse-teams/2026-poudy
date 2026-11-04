package com.poudy.product.domain;

import java.util.List;

public record ProductComparison(List<ProductComparisonItem> items) {

    public ProductComparison {
        items = List.copyOf(items);
    }
}
