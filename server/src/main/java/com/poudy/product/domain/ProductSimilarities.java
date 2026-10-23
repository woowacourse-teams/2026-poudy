package com.poudy.product.domain;

import com.poudy.excludecode.domain.ExcludeCodes;
import java.util.Collection;
import java.util.List;

public record ProductSimilarities(
    Product source,
    Long partId,
    boolean calculated,
    List<SimilarProduct> items,
    ExcludeCodes excludeCodes) {
    public ProductSimilarities {
        items = List.copyOf(items);
    }

    public List<MyFilteredSimilarProduct> filteredBy(Collection<Long> myFilterIngredientIds) {
        return items.stream()
            .map(item -> item.filteredBy(myFilterIngredientIds))
            .toList();
    }
}
