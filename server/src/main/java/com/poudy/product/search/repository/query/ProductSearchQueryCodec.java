package com.poudy.product.search.repository.query;

import com.poudy.product.search.domain.analysis.ProductSearchAnalyzer;
import com.poudy.product.search.domain.query.AnalyzedProductQuery;
import com.poudy.product.search.domain.query.SearchToken;
import java.util.Map;
import tools.jackson.databind.json.JsonMapper;

public final class ProductSearchQueryCodec {
    private final JsonMapper json = JsonMapper.builder().build();

    public String encode(AnalyzedProductQuery query) {
        return json.writeValueAsString(
            Map.of(
                "version",
                ProductSearchAnalyzer.VERSION,
                "whole",
                token(query.whole()),
                "tokens",
                query.tokens().stream().map(this::token).toList(),
                "splits",
                query.splits().stream().map(s -> Map.of("brand", token(s.brand()), "product", token(s.product())))
                    .toList()
            )
        );
    }

    private Map<String, Object> token(SearchToken token) {
        return Map.of(
            "norm",
            token.normalized(),
            "initials",
            token.isInitials(),
            "pattern",
            token.initialPattern(),
            "expressions",
            token.expressions()
        );
    }
}
