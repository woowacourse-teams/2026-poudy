package com.poudy.ingredient.controller.dto;

import com.poudy.ingredient.domain.IngredientSuggestions;
import com.poudy.ingredientgroup.controller.dto.IngredientGroupSuggestionResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record IngredientListResponse(
    @NotNull @Schema(description = "검색어에 일치한 성분") List<IngredientSuggestionResponse> items,
    @NotNull List<IngredientGroupSuggestionResponse> groups) {

    public static IngredientListResponse from(IngredientSuggestions suggestions) {
        return new IngredientListResponse(
            suggestions.ingredients().stream()
                .map(IngredientSuggestionResponse::from)
                .toList(),
            suggestions.groups().stream()
                .map(IngredientGroupSuggestionResponse::from)
                .toList()
        );
    }
}
