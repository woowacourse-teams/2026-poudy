package com.poudy.product.domain;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

public class Products {

    private final List<Product> products;

    public Products(List<Product> products) {
        this.products = List.copyOf(Objects.requireNonNullElse(products, List.of()));
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

    public Map<Long, Long> countByCategoryId() {
        // spotless:off
        return products.stream()
                .collect(Collectors.toUnmodifiableMap(Product::categoryId, product -> 1L, Long::sum));
        // spotless:on
    }
}
