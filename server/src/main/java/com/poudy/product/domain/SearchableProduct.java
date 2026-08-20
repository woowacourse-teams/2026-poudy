package com.poudy.product.domain;

import com.poudy.common.domain.NameRank;
import com.poudy.common.domain.SearchKeyword;
import com.poudy.common.domain.SearchableText;

public record SearchableProduct(Product product, SearchableText productName, SearchableText brandName) {

    public static SearchableProduct of(Product product) {
        return new SearchableProduct(
                product,
                SearchableText.of(product.name()),
                SearchableText.of(product.brand().koreanName()));
    }

    public NameRank match(SearchKeyword keyword) {
        NameRank productNameMatch = match(keyword, productName);
        NameRank brandNameMatch = match(keyword, brandName);

        return productNameMatch.compareTo(brandNameMatch) <= 0 ? productNameMatch : brandNameMatch;
    }

    public NameRank matchProductName(SearchKeyword keyword) {
        return match(keyword, productName);
    }

    private static NameRank match(SearchKeyword keyword, SearchableText name) {
        return NameRank.of(keyword.match(name), name);
    }
}
