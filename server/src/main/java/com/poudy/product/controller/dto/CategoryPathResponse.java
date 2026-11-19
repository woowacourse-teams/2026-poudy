package com.poudy.product.controller.dto;

import com.poudy.category.controller.dto.CategorySummaryResponse;
import com.poudy.category.domain.Category;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record CategoryPathResponse(
    @NotNull @Schema(description = "대분류 ID", example = "1") Long id,
    @NotNull @Schema(description = "대분류 이름", example = "스킨케어") String name,
    @NotNull @Schema(description = "제품이 속한 소분류") CategorySummaryResponse child) {

    public static List<CategoryPathResponse> from(List<Category> path) {
        Category parent = path.getFirst();
        Category subcategory = path.get(1);
        CategorySummaryResponse child = new CategorySummaryResponse(subcategory.id(), subcategory.name());

        return List.of(new CategoryPathResponse(parent.id(), parent.name(), child));
    }
}
