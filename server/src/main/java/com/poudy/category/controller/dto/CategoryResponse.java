package com.poudy.category.controller.dto;

import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import com.poudy.category.domain.CountedCategory;
import com.poudy.product.domain.ProductCountsByCategory;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record CategoryResponse(
        @NotNull @Schema(example = "1") Long id,
        @NotNull @Schema(example = "스킨케어") String name,
        @NotNull List<CategoryChildResponse> children,
        @NotNull @Schema(example = "51") Long productCount) {

    public static CategoryResponse from(
            Category parentCategory,
            Categories categories,
            ProductCountsByCategory productCounts) {
        List<Category> childCategories = categories.childrenOf(parentCategory);
        List<CategoryChildResponse> childResponses = childCategories.stream()
                .map(child -> CategoryChildResponse.from(child, productCounts))
                .toList();
        long productCount = productCounts.countOf(parentCategory);

        return new CategoryResponse(parentCategory.id(), parentCategory.name(), childResponses, productCount);
    }

    public static CategoryResponse from(CountedCategory countedCategory) {
        List<CategoryChildResponse> childResponses = countedCategory.children().stream()
                .map(CategoryChildResponse::from)
                .toList();

        return new CategoryResponse(
                countedCategory.id(),
                countedCategory.name(),
                childResponses,
                countedCategory.productCount());
    }
}
