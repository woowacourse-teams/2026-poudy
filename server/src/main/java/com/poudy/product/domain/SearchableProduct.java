package com.poudy.product.domain;

import com.poudy.search.domain.SearchKeyword;
import com.poudy.search.domain.SearchableText;
import com.poudy.search.domain.TextMatch;
import java.util.List;
import java.util.Optional;

public record SearchableProduct(Product product, List<SearchableText> productNames) {

    public SearchableProduct {
        productNames = List.copyOf(productNames);
    }

    public static SearchableProduct of(Product product) {
        return new SearchableProduct(product, SearchableText.formsOf(product.name()));
    }

    public Optional<MatchedProduct> match(SearchKeyword keyword) {
        Optional<TextMatch> productNameMatch = matchProductName(keyword);
        Optional<TextMatch> brandNameMatch = product.findBrandMatch(keyword);

        if (isBetterThan(brandNameMatch, productNameMatch)) {
            return brandNameMatch.map(match -> new MatchedProduct(product, ProductMatchField.BRAND_NAME, match));
        }
        return productNameMatch.map(match -> new MatchedProduct(product, ProductMatchField.PRODUCT_NAME, match));
    }

    public Optional<MatchedProduct> matchByProductName(SearchKeyword keyword) {
        return matchProductName(keyword)
            .map(match -> new MatchedProduct(product, ProductMatchField.PRODUCT_NAME, match));
    }

    private Optional<TextMatch> matchProductName(SearchKeyword keyword) {
        return TextMatch.best(productNames, keyword);
    }

    private static boolean isBetterThan(Optional<TextMatch> candidate, Optional<TextMatch> current) {
        if (candidate.isEmpty()) {
            return false;
        }
        return current.isEmpty() || candidate.get().rank().isBetterThan(current.get().rank());
    }
}
