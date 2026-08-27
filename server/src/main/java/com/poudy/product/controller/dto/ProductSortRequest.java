package com.poudy.product.controller.dto;

import com.poudy.product.domain.ProductSort;
import io.swagger.v3.oas.annotations.media.Schema;

public record ProductSortRequest(
    @Schema(description = "정렬 조건", defaultValue = ProductSort.DEFAULT_NAME) ProductSort sort) {
}
