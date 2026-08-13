package com.poudy.product.domain;

import java.util.Objects;

public enum ProductSort {

    NAME_ASC,
    NAME_DESC,
    PRICE_ASC,
    PRICE_DESC;

    public static final String DEFAULT_NAME = "NAME_ASC";

    public static ProductSort orDefault(ProductSort sort) {
        return Objects.requireNonNullElse(sort, NAME_ASC);
    }
}
