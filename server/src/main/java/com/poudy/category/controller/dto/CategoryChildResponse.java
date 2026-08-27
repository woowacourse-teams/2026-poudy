package com.poudy.category.controller.dto;

import com.poudy.product.domain.CategoryProductCount;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record CategoryChildResponse(
    @NotNull @Schema(example = "2") Long id,
    @NotNull @Schema(example = "스킨/토너") String name,
    @NotNull @Schema(example = "30") Long productCount) {

    public static CategoryChildResponse from(CategoryProductCount categoryProductCount) {
        return new CategoryChildResponse(
            categoryProductCount.id(),
            categoryProductCount.name(),
            categoryProductCount.productCount()
        );
    }
}
