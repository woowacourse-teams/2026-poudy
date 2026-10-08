package com.poudy.product.domain;

import com.poudy.excludecode.domain.ExcludeCodes;
import java.util.List;

public record ProductSimilarities(
    Long partId,
    boolean calculated,
    List<SimilarProduct> items,
    ExcludeCodes excludeCodes) {
    public ProductSimilarities {
        items = List.copyOf(items);
    }
}
