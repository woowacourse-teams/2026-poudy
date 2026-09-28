package com.poudy.product.domain;

import java.util.List;

public record ProductSuggestions(List<ProductSuggestion> items, long totalElements) {

    public ProductSuggestions {
        items = List.copyOf(items);
    }
}
