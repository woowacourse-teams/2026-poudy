package com.poudy.product.domain;

import com.poudy.search.domain.NameRank;
import com.poudy.search.domain.SearchKeyword;
import com.poudy.search.domain.SearchableText;
import java.util.List;

public record SearchableProduct(Product product, List<SearchableText> productNames) {

    public SearchableProduct {
        productNames = List.copyOf(productNames);
    }

    public static SearchableProduct of(Product product) {
        return new SearchableProduct(product, SearchableText.formsOf(product.name()));
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
        return NameRank.best(productNames, keyword);
    }
}
