package com.poudy.ingredient.controller.dto;

import com.poudy.common.dto.PaginationRequest;
import com.poudy.common.dto.PaginationResponse;
import com.poudy.ingredient.domain.IngredientPage;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record IngredientPageResponse(
    @NotNull @Schema(description = "조회된 성분") List<IngredientResponse> items,
    @NotNull PaginationResponse pagination) {

    public static IngredientPageResponse from(IngredientPage page, PaginationRequest pagination) {
        return new IngredientPageResponse(
            page.items().stream()
                .map(IngredientResponse::from)
                .toList(),
            PaginationResponse.of(pagination, page.totalElements())
        );
    }
}
