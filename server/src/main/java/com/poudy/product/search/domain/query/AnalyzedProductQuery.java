package com.poudy.product.search.domain.query;

import java.util.List;
import java.util.stream.Collectors;

public final class AnalyzedProductQuery {
    private final SearchToken whole;
    private final List<SearchToken> tokens;
    private final List<BrandProductSplit> splits;

    public AnalyzedProductQuery(SearchToken whole, List<SearchToken> tokens, List<BrandProductSplit> splits) {
        this.whole = whole;
        this.tokens = List.copyOf(tokens);
        this.splits = List.copyOf(splits);
    }

    public SearchToken whole() {
        return whole;
    }

    public List<SearchToken> tokens() {
        return tokens;
    }

    public List<BrandProductSplit> splits() {
        return splits;
    }

    public String correctionText() {
        return tokens.stream().map(SearchToken::normalized).collect(Collectors.joining(" "));
    }

    public boolean hasSameText(AnalyzedProductQuery other) {
        return correctionText().equals(other.correctionText());
    }
}
