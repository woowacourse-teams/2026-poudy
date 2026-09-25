package com.poudy.product.domain;

public enum ProductSort {
    DEFAULT,
    PRICE_DESC,
    PRICE_ASC,
    UNIT_PRICE_DESC,
    UNIT_PRICE_ASC;
    public static final String DEFAULT_NAME = "DEFAULT";
    public static ProductSort orDefault(ProductSort sort) {
        return sort == null ? DEFAULT : sort;
    }
}
