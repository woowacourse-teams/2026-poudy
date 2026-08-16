package com.poudy.category.controller.dto;

import com.poudy.category.domain.Category;
import com.poudy.category.domain.CategoryCounts;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record CategoryChildResponse(
        @NotNull @Schema(example = "2") Long id,
        @NotNull @Schema(example = "스킨/토너") String name,
        @NotNull @Schema(example = "30") Long productCount) {

    public static CategoryChildResponse from(Category child, CategoryCounts categoryCounts) {
        return new CategoryChildResponse(child.id(), child.name(), categoryCounts.productCountOf(child));
    }
}
