package com.poudy.product.domain;

import java.util.List;

public class Products {

    private final List<Product> products;

    public Products(List<Product> products) {
        this.products = products == null ? List.of() : List.copyOf(products);
    }

    public long countContaining(Long ingredientId) {
        if (ingredientId == null) {
            return 0;
        }

        return products.stream().filter(product -> product.contains(ingredientId)).count();
    }

    public List<Product> values() {
        return products;
    }
}
