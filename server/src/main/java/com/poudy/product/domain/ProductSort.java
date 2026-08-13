package com.poudy.product.domain;

public enum ProductSort {

    NAME_ASC,
    NAME_DESC,
    PRICE_ASC,
    PRICE_DESC;

    public static final String DEFAULT_NAME = "NAME_ASC";

    public static ProductSort orDefault(ProductSort sort) {
        return sort == null ? NAME_ASC : sort;
    }
}
