package com.poudy.product.domain;

import com.poudy.common.domain.SearchKeyword;
import java.util.List;
import java.util.Objects;

public class Products {

    private final List<Product> products;
    private final List<SearchableProduct> searchable;

    public Products(List<Product> products) {
        this.products = List.copyOf(Objects.requireNonNullElse(products, List.of()));
        // spotless:off
        this.searchable = this.products.stream()
                .map(SearchableProduct::of)
                .toList();
        // spotless:on
    }

    public List<Product> search(String keyword) {
        SearchKeyword searchKeyword = new SearchKeyword(keyword);

        // spotless:off
        return searchable.stream()
                .map(product -> MatchedProduct.of(product, searchKeyword))
                .filter(MatchedProduct::isFound)
                .sorted(MatchedProduct.order())
                .map(MatchedProduct::product)
                .toList();
        // spotless:on
    }

    public long countContaining(Long ingredientId) {
        if (ingredientId == null) {
            return 0;
        }

        // spotless:off
        return products.stream()
                .filter(product -> product.contains(ingredientId))
                .count();
        // spotless:on
    }
}
