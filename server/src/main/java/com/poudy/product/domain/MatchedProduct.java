package com.poudy.product.domain;

import com.poudy.common.domain.NameRank;
import com.poudy.common.domain.SearchKeyword;
import java.util.Comparator;

public record MatchedProduct(Product product, NameRank match) {

    private static final Comparator<MatchedProduct> ORDER = Comparator.comparing(MatchedProduct::match)
            .thenComparing(matched -> matched.product().id());

    public static MatchedProduct of(SearchableProduct searchable, SearchKeyword keyword) {
        return new MatchedProduct(searchable.product(), searchable.match(keyword));
    }

    public static MatchedProduct ofProductName(SearchableProduct searchable, SearchKeyword keyword) {
        return new MatchedProduct(searchable.product(), searchable.matchProductName(keyword));
    }

    public static Comparator<MatchedProduct> order() {
        return ORDER;
    }

    public boolean isFound() {
        return match.isFound();
    }
}
