package com.poudy.category.controller.dto;

import com.poudy.category.domain.Category;
import com.poudy.category.domain.CategoryCounts;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record CategoryResponse(
        @NotNull @Schema(example = "1") Long id,
        @NotNull @Schema(example = "스킨케어") String name,
        @NotNull List<CategoryChildResponse> children,
        @NotNull @Schema(example = "51") Long productCount) {

    public static CategoryResponse from(Category parentCategory, CategoryCounts categoryCounts) {
        List<Category> childCategories = categoryCounts.childrenOf(parentCategory);
        List<CategoryChildResponse> childResponses = childCategories.stream()
                .map(child -> CategoryChildResponse.from(child, categoryCounts))
                .toList();
        long productCount = categoryCounts.productCountOf(parentCategory);

        return new CategoryResponse(parentCategory.id(), parentCategory.name(), childResponses, productCount);
    }
}
