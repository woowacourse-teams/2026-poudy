package com.poudy.product.domain;

import com.poudy.search.domain.NameMatch;
import com.poudy.search.domain.SearchKeyword;
import com.poudy.search.domain.SearchableText;
import com.poudy.search.domain.TextMatch;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

public final class SearchableProduct {

    private final Product product;
    private final List<SearchableText> productNames;

    private SearchableProduct(Product product, List<SearchableText> productNames) {
        this.product = product;
        this.productNames = List.copyOf(productNames);
    }

    public Product product() {
        return product;
    }

    public static SearchableProduct of(Product product) {
        return new SearchableProduct(product, SearchableText.formsOf(product.name()));
    }

    public Optional<MatchedProduct> match(ProductSearchQuery query) {
        Optional<MatchedProduct> direct = matchDirectly(query.whole());
        if (direct.isPresent()) {
            return direct;
        }

        return query.parts().stream()
            .map(this::matchCombined)
            .flatMap(Optional::stream)
            .min(CombinedMatch.ORDER)
            .map(match -> MatchedProduct.combined(product, match.brand(), match.product()));
    }

    private Optional<MatchedProduct> matchDirectly(SearchKeyword keyword) {
        Optional<TextMatch> productNameMatch = matchProductName(keyword);
        Optional<TextMatch> brandNameMatch = product.findBrandMatch(keyword);

        if (isBetterThan(brandNameMatch, productNameMatch)) {
            return brandNameMatch.map(match -> new MatchedProduct(product, ProductMatchField.BRAND_NAME, match));
        }
        return productNameMatch.map(match -> new MatchedProduct(product, ProductMatchField.PRODUCT_NAME, match));
    }

    private Optional<CombinedMatch> matchCombined(ProductSearchQuery.Parts parts) {
        Optional<TextMatch> brandMatch = product.findBrandMatch(parts.brand());
        if (brandMatch.isEmpty() || !matchesBrandPrefix(brandMatch.get())) {
            return Optional.empty();
        }

        return matchProductName(parts.product())
            .map(productMatch -> new CombinedMatch(brandMatch.get(), productMatch));
    }

    private static boolean matchesBrandPrefix(TextMatch match) {
        return match.rank().match() == NameMatch.EXACT || match.rank().match() == NameMatch.PREFIX;
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

    private record CombinedMatch(TextMatch brand, TextMatch product) {

        private static final Comparator<CombinedMatch> ORDER = Comparator
            .comparing((CombinedMatch match) -> match.brand().rank())
            .thenComparing(match -> match.product().rank());
    }
}
