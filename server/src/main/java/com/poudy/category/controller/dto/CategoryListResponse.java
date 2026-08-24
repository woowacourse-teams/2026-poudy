package com.poudy.category.controller.dto;

import com.poudy.category.domain.Category;
import com.poudy.category.domain.CategoryCounts;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record CategoryListResponse(@NotNull List<CategoryResponse> items) {

    public static CategoryListResponse from(CategoryCounts categoryCounts) {
        List<Category> parentCategories = categoryCounts.parents();
        List<CategoryResponse> parentCategoryResponses = parentCategories.stream()
                .map(parent -> CategoryResponse.from(parent, categoryCounts))
                .toList();

        return new CategoryListResponse(parentCategoryResponses);
    }
}
