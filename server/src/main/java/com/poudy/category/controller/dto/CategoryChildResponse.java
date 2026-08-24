package com.poudy.category.controller.dto;

import com.poudy.category.domain.Category;
import com.poudy.category.domain.CategoryCounts;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record CategoryChildResponse(
        @NotNull @Schema(example = "2") Long id,
        @NotNull @Schema(example = "스킨/토너") String name,
        @NotNull @Schema(example = "30") Long productCount) {

    public static CategoryChildResponse from(Category childCategory, CategoryCounts categoryCounts) {
        long productCount = categoryCounts.productCountOf(childCategory);

        return new CategoryChildResponse(childCategory.id(), childCategory.name(), productCount);
    }
}
