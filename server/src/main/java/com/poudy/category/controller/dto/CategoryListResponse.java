package com.poudy.category.controller.dto;

import com.poudy.category.domain.CategoryCounts;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record CategoryListResponse(@NotNull List<CategoryResponse> items) {

    public static CategoryListResponse from(CategoryCounts categoryCounts) {
        // spotless:off
        return new CategoryListResponse(categoryCounts.parents().stream()
                .map(parent -> CategoryResponse.from(parent, categoryCounts))
                .toList());
        // spotless:on
    }
}
