package com.poudy.product.domain;

import java.util.List;

public record ProductComparison(ProductComparisonFilterStatus myFilterStatus, List<ProductComparisonItem> items) {

    public ProductComparison {
        items = List.copyOf(items);
    }
}
