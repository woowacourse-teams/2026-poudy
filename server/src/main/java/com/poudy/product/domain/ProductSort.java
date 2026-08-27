package com.poudy.product.domain;

import java.util.Comparator;

public enum ProductSort {

    NAME_ASC(Comparator.comparing(Product::name).thenComparing(Product::id)),
    NAME_DESC(Comparator.comparing(Product::name).reversed().thenComparing(Product::id)),
    PRICE_ASC(Comparator.comparing((Product product) -> product.representativeVariant().price())
            .thenComparing(Product::id)),
    PRICE_DESC(Comparator.comparing((Product product) -> product.representativeVariant().price())
            .reversed()
            .thenComparing(Product::id));

    public static final String DEFAULT_NAME = "NAME_ASC";

    private final Comparator<Product> comparator;

    ProductSort(Comparator<Product> comparator) {
        this.comparator = comparator;
    }

    public Comparator<Product> comparator() {
        return comparator;
    }

    public static ProductSort orDefault(ProductSort sort) {
        if (sort == null) {
            return NAME_ASC;
        }

        return sort;
    }
}
