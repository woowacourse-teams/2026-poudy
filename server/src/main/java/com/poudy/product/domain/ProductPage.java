package com.poudy.product.domain;

import java.util.List;

public record ProductPage(
    List<ProductCard> items,
    long totalElements,
    ProductFilterOptions filterOptions,
    ProductSelectedFilters selectedFilters) {

    public ProductPage {
        items = List.copyOf(items);
    }
}
