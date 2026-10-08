package com.poudy.product.domain;

import com.poudy.excludecode.domain.ExcludeCodes;

public record SimilarProduct(Product product, ProductPart part) {

    public boolean containsExcludedIngredient(ExcludeCodes excludeCodes) {
        return part.countContainedFrom(excludeCodes.groups()) > 0;
    }
}
