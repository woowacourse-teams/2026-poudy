package com.poudy.product.domain;

import com.poudy.excludecode.domain.ExcludeCodes;
import java.util.Collection;
import java.util.List;

public final class ProductSimilarities {

    private final Product source;
    private final Long partId;
    private final boolean calculated;
    private final List<SimilarProduct> items;
    private final ExcludeCodes excludeCodes;
    private final SharedIngredientGroupCandidates groupCandidates;

    private ProductSimilarities(
        Product source,
        Long partId,
        boolean calculated,
        List<SimilarProduct> items,
        ExcludeCodes excludeCodes,
        SharedIngredientGroupCandidates groupCandidates
    ) {
        this.source = source;
        this.partId = partId;
        this.calculated = calculated;
        this.items = List.copyOf(items);
        this.excludeCodes = excludeCodes;
        this.groupCandidates = groupCandidates;
    }

    public static ProductSimilarities uncalculated(Product source, Long partId, ExcludeCodes excludeCodes) {
        return new ProductSimilarities(
            source,
            partId,
            false,
            List.of(),
            excludeCodes,
            SharedIngredientGroupCandidates.empty()
        );
    }

    public static ProductSimilarities fromResults(
        Product source,
        Long partId,
        List<SimilarProduct> items,
        ExcludeCodes excludeCodes,
        SharedIngredientGroupCandidates groupCandidates
    ) {
        return new ProductSimilarities(source, partId, true, items, excludeCodes, groupCandidates);
    }

    public Product source() {
        return source;
    }

    public Long partId() {
        return partId;
    }

    public boolean calculated() {
        return calculated;
    }

    public List<SimilarProduct> items() {
        return items;
    }

    public boolean containsExcludedIngredient(SimilarProduct item) {
        return item.containsExcludedIngredient(excludeCodes);
    }

    public List<SharedIngredientGroup> sharedIngredientGroupsFor(SimilarProduct item) {
        return item.sharedIngredientGroups(groupCandidates);
    }

    public List<MyFilteredSimilarProduct> filteredBy(Collection<Long> myFilterIngredientIds) {
        return items.stream()
            .map(item -> item.filteredBy(myFilterIngredientIds, sharedIngredientGroupsFor(item)))
            .toList();
    }
}
