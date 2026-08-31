package com.poudy.product.domain;

import com.poudy.search.domain.SearchKeyword;
import java.util.ArrayList;
import java.util.List;

final class ProductSearchQuery {

    private final SearchKeyword whole;
    private final List<Parts> parts;

    ProductSearchQuery(String keyword) {
        this.whole = new SearchKeyword(keyword);
        this.parts = partsOf(whole.value());
    }

    SearchKeyword whole() {
        return whole;
    }

    List<Parts> parts() {
        return parts;
    }

    private static List<Parts> partsOf(String keyword) {
        List<Parts> parts = new ArrayList<>();

        for (int split = nextCodePointIndex(keyword, 0); split < keyword.length();
            split = nextCodePointIndex(keyword, split)) {
            parts.add(
                new Parts(
                    new SearchKeyword(keyword.substring(0, split)),
                    new SearchKeyword(keyword.substring(split))
                )
            );
        }

        return List.copyOf(parts);
    }

    private static int nextCodePointIndex(String value, int index) {
        return value.offsetByCodePoints(index, 1);
    }

    record Parts(SearchKeyword brand, SearchKeyword product) {
    }
}
