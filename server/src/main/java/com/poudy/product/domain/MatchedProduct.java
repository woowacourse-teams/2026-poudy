package com.poudy.product.domain;

import com.poudy.search.domain.SearchKeyword;
import com.poudy.search.domain.TextMatch;
import java.util.Comparator;
import java.util.Optional;

public final class MatchedProduct {

    private static final Comparator<MatchedProduct> ORDER = Comparator
        .comparing((MatchedProduct matched) -> matched.textMatch().rank())
        .thenComparing(matched -> matched.product().id());

    private final Product product;
    private final ProductMatchField field;
    private final TextMatch textMatch;

    public MatchedProduct(Product product, ProductMatchField field, TextMatch textMatch) {
        if (product == null || field == null || textMatch == null) {
            throw new IllegalArgumentException("제품 검색 일치 결과의 값이 필요합니다.");
        }
        this.product = product;
        this.field = field;
        this.textMatch = textMatch;
    }

    public static Optional<MatchedProduct> of(SearchableProduct searchable, SearchKeyword keyword) {
        return searchable.match(keyword);
    }

    public static Optional<MatchedProduct> ofProductName(SearchableProduct searchable, SearchKeyword keyword) {
        return searchable.matchByProductName(keyword);
    }

    public static Comparator<MatchedProduct> order() {
        return ORDER;
    }

    public Product product() {
        return product;
    }

    public ProductMatchField field() {
        return field;
    }

    public TextMatch textMatch() {
        return textMatch;
    }
}
