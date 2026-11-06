package com.poudy.product.domain;

import com.poudy.excludecode.domain.ExcludeCodes;
import java.util.Collection;

public record SimilarProduct(Product product, ProductPart part) {

    public UnitPrice unitPrice() {
        return product.representativeVariant().unitPrice();
    }

    public boolean containsExcludedIngredient(ExcludeCodes excludeCodes) {
        return part.countContainedFrom(excludeCodes.groups()) > 0;
    }

    public MyFilteredSimilarProduct filteredBy(Collection<Long> myFilterIngredientIds) {
        return new MyFilteredSimilarProduct(product.id(), part.containsAnyIngredient(myFilterIngredientIds));
    }
}
