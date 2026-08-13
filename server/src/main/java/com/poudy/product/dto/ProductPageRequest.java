package com.poudy.product.dto;

import com.poudy.product.domain.ProductSort;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record ProductPageRequest(ProductSort sort, @Min(0) Integer page, @Min(1) @Max(MAX_SIZE) Integer size) {

    private static final int MAX_SIZE = 100;
    private static final ProductSort DEFAULT_SORT = ProductSort.NAME_ASC;
    private static final int DEFAULT_PAGE = 0;
    private static final int DEFAULT_SIZE = 20;

    public ProductPageRequest {
        sort = sort == null ? DEFAULT_SORT : sort;
        page = page == null ? DEFAULT_PAGE : page;
        size = size == null ? DEFAULT_SIZE : size;
    }
}
