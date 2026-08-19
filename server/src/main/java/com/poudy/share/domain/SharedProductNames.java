package com.poudy.share.domain;

import com.poudy.brand.domain.Brands;
import com.poudy.product.domain.Products;
import java.util.List;
import java.util.Objects;

public class SharedProductNames {

    private final List<SharedProductName> values;

    public SharedProductNames(List<SharedProductName> values) {
        this.values = List.copyOf(Objects.requireNonNullElse(values, List.of()));
    }

    public static SharedProductNames of(ShareText text, Brands brands) {
        return new SharedProductNames(
                text.productPhrases().stream()
                        .map(phrase -> SharedProductName.of(phrase, brands))
                        .filter(name -> !name.isEmpty())
                        .toList());
    }

    public boolean isEmpty() {
        return values.isEmpty();
    }

    // 넓은 후보부터 맞춰 보고, 모두 실패하면 가장 좁힌 후보의 검색어를 넘긴다.
    public ShareMatch matchIn(Products products) {
        ShareMatch unmatched = ShareMatch.notFound("");

        for (SharedProductName name : values) {
            ShareMatch match = name.matchIn(products);

            if (!match.isNotFound()) {
                return match;
            }
            unmatched = match;
        }

        return unmatched;
    }

    public SharedProductName narrowest() {
        return values.getLast();
    }
}
