package com.poudy.product.domain;

import com.poudy.excludecode.domain.ExcludeCodes;
import java.util.Collection;

public record SimilarProduct(Product product, ProductPart part) {

    public boolean containsExcludedIngredient(ExcludeCodes excludeCodes) {
        return part.countContainedFrom(excludeCodes.groups()) > 0;
    }

    public SkinFilteredSimilarProduct filteredBy(Collection<Long> skinFilterIngredientIds) {
        return new SkinFilteredSimilarProduct(product.id(), part.containsAnyIngredient(skinFilterIngredientIds));
    }
}
