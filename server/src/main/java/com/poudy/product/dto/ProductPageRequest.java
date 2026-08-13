package com.poudy.product.dto;

import com.poudy.product.domain.ProductSort;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record ProductPageRequest(@Schema(defaultValue = DEFAULT_SORT_TEXT) ProductSort sort,
        @Schema(defaultValue = DEFAULT_PAGE_TEXT) @Min(0) Integer page,
        @Schema(defaultValue = DEFAULT_SIZE_TEXT) @Min(1) @Max(MAX_SIZE) Integer size) {

    private static final int MAX_SIZE = 100;
    private static final int DEFAULT_PAGE = 0;
    private static final int DEFAULT_SIZE = 20;
    private static final String DEFAULT_SORT_TEXT = "NAME_ASC";
    private static final String DEFAULT_PAGE_TEXT = "" + DEFAULT_PAGE;
    private static final String DEFAULT_SIZE_TEXT = "" + DEFAULT_SIZE;
    private static final ProductSort DEFAULT_SORT = ProductSort.valueOf(DEFAULT_SORT_TEXT);

    public ProductPageRequest {
        sort = sort == null ? DEFAULT_SORT : sort;
        page = page == null ? DEFAULT_PAGE : page;
        size = size == null ? DEFAULT_SIZE : size;
    }
}
