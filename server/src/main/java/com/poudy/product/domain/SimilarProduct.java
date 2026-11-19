package com.poudy.product.domain;

import com.poudy.excludecode.domain.ExcludeCodes;
import java.util.Collection;
import java.util.List;

public final class SimilarProduct {

    private final Product product;
    private final ProductPart part;

    public SimilarProduct(Product product, ProductPart part) {
        this.product = product;
        this.part = part;
    }

    public Product product() {
        return product;
    }

    public Long partId() {
        return part.id();
    }

    public UnitPrice unitPrice() {
        return product.unitPrice();
    }

    public int compareUnitPriceTo(SimilarProduct other, UnitPrice base) {
        UnitPrice candidatePrice = unitPrice();
        UnitPrice otherPrice = other.unitPrice();
        return candidatePrice.compareAsAlternativeTo(otherPrice, base);
    }

    public boolean containsExcludedIngredient(ExcludeCodes excludeCodes) {
        return part.countContainedFrom(excludeCodes.groups()) > 0;
    }

    List<SharedIngredientGroup> sharedIngredientGroups(SharedIngredientGroupCandidates candidates) {
        return candidates.sharedWith(part);
    }

    public List<Long> ingredientIds() {
        return part.ingredientIds();
    }

    MyFilteredSimilarProduct filteredBy(
        Collection<Long> myFilterIngredientIds,
        List<SharedIngredientGroup> sharedGroups
    ) {
        return new MyFilteredSimilarProduct(
            product.id(),
            part.containsAnyIngredient(myFilterIngredientIds),
            sharedGroups
        );
    }
}
