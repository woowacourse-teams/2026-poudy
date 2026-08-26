package com.poudy.category.controller.dto;

import com.poudy.product.domain.CategoryProductCount;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record CategoryResponse(
        @NotNull @Schema(example = "1") Long id,
        @NotNull @Schema(example = "스킨케어") String name,
        @NotNull List<CategoryChildResponse> children,
        @NotNull @Schema(example = "51") Long productCount) {

    public static CategoryResponse from(CategoryProductCount categoryProductCount) {
        List<CategoryChildResponse> childResponses = categoryProductCount.children().stream()
                .map(CategoryChildResponse::from)
                .toList();

        return new CategoryResponse(
                categoryProductCount.id(),
                categoryProductCount.name(),
                childResponses,
                categoryProductCount.productCount());
    }
}
