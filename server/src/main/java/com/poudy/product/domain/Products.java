package com.poudy.product.domain;

import java.util.List;
import java.util.Objects;

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

    public List<Product> values() {
        return products;
    }
}
