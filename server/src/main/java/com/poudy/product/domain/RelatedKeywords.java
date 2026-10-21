package com.poudy.product.domain;

import java.util.List;
import java.util.function.Function;

public final class RelatedKeywords {

    private final List<RelatedKeyword> items;

    public RelatedKeywords(List<RelatedKeyword> items) {
        this.items = items;
    }

    public <T> List<T> mapItems(Function<RelatedKeyword, T> mapper) {
        return items.stream().map(mapper).toList();
    }
}
