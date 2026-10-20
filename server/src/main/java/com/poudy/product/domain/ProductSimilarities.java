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

    public List<SkinFilteredSimilarProduct> filteredBy(Collection<Long> skinFilterIngredientIds) {
        return items.stream()
            .map(item -> item.filteredBy(skinFilterIngredientIds))
            .toList();
    }
}
