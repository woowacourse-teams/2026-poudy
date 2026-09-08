package com.poudy.curation.controller.dto;

import com.poudy.category.domain.Category;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record CurationCategoryResponse(
    @NotNull @Schema(description = "카테고리 ID", example = "1") Long id,
    @NotNull @Schema(description = "카테고리 이름", example = "스킨케어") String name) {

    public static List<CurationCategoryResponse> from(List<Category> categories) {
        return categories.stream()
            .map(category -> new CurationCategoryResponse(category.id(), category.name()))
            .toList();
    }
}
