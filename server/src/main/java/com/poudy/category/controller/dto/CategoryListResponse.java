package com.poudy.category.controller.dto;

import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import com.poudy.product.domain.ProductCountsByCategory;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record CategoryListResponse(@NotNull List<CategoryResponse> items) {

    public static CategoryListResponse from(Categories categories, ProductCountsByCategory productCounts) {
        List<Category> parentCategories = categories.parents();
        List<CategoryResponse> parentCategoryResponses = parentCategories.stream()
                .map(parent -> CategoryResponse.from(parent, categories, productCounts))
                .toList();

        return new CategoryListResponse(parentCategoryResponses);
    }
}
