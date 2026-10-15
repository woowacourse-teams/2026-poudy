package com.poudy.product.domain;

import com.poudy.search.domain.MatchRange;
import java.util.List;
import java.util.Objects;

public record ProductSuggestion(
    Long id,
    String name,
    String brandName,
    List<Badge> badges,
    String imageUrl,
    ProductMatchField field,
    String text,
    MatchRange range) {

    public ProductSuggestion {
        badges = List.copyOf(badges);
        Objects.requireNonNull(id);
        Objects.requireNonNull(name);
        Objects.requireNonNull(imageUrl);
        Objects.requireNonNull(brandName);
        Objects.requireNonNull(field);
        Objects.requireNonNull(text);
        Objects.requireNonNull(range);
        if (range.endIndexExclusive() > text.length()) {
            throw new IllegalArgumentException("제품 검색 일치 구간이 원문 범위를 벗어났습니다.");
        }
    }
}
