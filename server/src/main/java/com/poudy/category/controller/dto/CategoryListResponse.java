package com.poudy.category.controller.dto;

import com.poudy.product.domain.CategoryProductCount;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record CategoryListResponse(@NotNull List<CategoryResponse> items) {

    public static CategoryListResponse from(List<CategoryProductCount> categoryProductCounts) {
        List<CategoryResponse> parentCategoryResponses = categoryProductCounts.stream()
                .map(CategoryResponse::from)
                .toList();

        return new CategoryListResponse(parentCategoryResponses);
    }
}
