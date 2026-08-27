package com.poudy.product.domain;

import java.util.List;

public record ProductSuggestionPage(List<MatchedProduct> items, long totalElements) {

    public ProductSuggestionPage {
        items = List.copyOf(items);
    }
}
