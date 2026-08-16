package com.poudy.product.domain;

import com.poudy.common.domain.NameRank;
import com.poudy.common.domain.SearchKeyword;
import com.poudy.common.domain.SearchableText;

public record SearchableProduct(Product product, SearchableText name) {

    public static SearchableProduct of(Product product) {
        return new SearchableProduct(product, SearchableText.of(product.productName()));
    }

    public NameRank match(SearchKeyword keyword) {
        return NameRank.of(keyword.match(name), name);
    }
}
