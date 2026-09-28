package com.poudy.product.domain;

import com.poudy.search.domain.MatchRange;
import java.util.Objects;

public record ProductSuggestion(Product product, ProductMatchField field, String text, MatchRange range) {

    public ProductSuggestion {
        Objects.requireNonNull(product);
        Objects.requireNonNull(field);
        Objects.requireNonNull(text);
        Objects.requireNonNull(range);
        if (range.endIndexExclusive() > text.length()) {
            throw new IllegalArgumentException("제품 검색 일치 구간이 원문 범위를 벗어났습니다.");
        }
    }
}
