package com.poudy.product.domain;

import com.poudy.common.domain.NameRank;
import com.poudy.common.domain.SearchKeyword;
import com.poudy.common.domain.SearchableText;

public record SearchableProduct(Product product, SearchableText productName) {

    public static SearchableProduct of(Product product) {
        return new SearchableProduct(product, SearchableText.of(product.name()));
    }

    public NameRank match(SearchKeyword keyword) {
        NameRank productNameMatch = matchProductName(keyword);
        NameRank brandNameMatch = product.matchBrandKeyword(keyword);

        if (brandNameMatch.isBetterThan(productNameMatch)) {
            return brandNameMatch;
        }
        return productNameMatch;
    }

    public NameRank matchProductName(SearchKeyword keyword) {
        return NameRank.of(keyword, productName);
    }
}
