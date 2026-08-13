package com.poudy.product.dto;

import com.poudy.product.domain.ProductSort;
import io.swagger.v3.oas.annotations.media.Schema;

public record ProductSortRequest(@Schema(description = "정렬 조건", defaultValue = DEFAULT_SORT_TEXT) ProductSort sort) {

    private static final String DEFAULT_SORT_TEXT = "NAME_ASC";
    private static final ProductSort DEFAULT_SORT = ProductSort.valueOf(DEFAULT_SORT_TEXT);

    public ProductSortRequest {
        sort = sort == null ? DEFAULT_SORT : sort;
    }
}
