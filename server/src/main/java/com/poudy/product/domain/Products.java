package com.poudy.product.domain;

import com.poudy.common.domain.SearchKeyword;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

public class Products {

    private final List<Product> products;
    private final List<SearchableProduct> searchable;

    public Products(List<Product> products) {
        this.products = List.copyOf(Objects.requireNonNullElse(products, List.of()));
        this.searchable = this.products.stream()
                .map(SearchableProduct::of)
                .toList();
    }

    public List<Product> search(String keyword) {
        SearchKeyword searchKeyword = new SearchKeyword(keyword);

        return searchable.stream()
                .map(product -> MatchedProduct.of(product, searchKeyword))
                .filter(MatchedProduct::isFound)
                .sorted(MatchedProduct.order())
                .map(MatchedProduct::product)
                .toList();
    }

    public long countContaining(Long ingredientId) {
        if (ingredientId == null) {
            return 0;
        }

        return products.stream()
                .filter(product -> product.contains(ingredientId))
                .count();
    }

    public Map<Long, Long> countByCategoryId() {
        return products.stream()
                .collect(Collectors.toUnmodifiableMap(Product::categoryId, product -> 1L, Long::sum));
    }
}
