package com.poudy.product.domain;

import java.util.List;

public record ProductSuggestionPage(List<Product> items, long totalElements) {

    public ProductSuggestionPage {
        items = List.copyOf(items);
    }
}
