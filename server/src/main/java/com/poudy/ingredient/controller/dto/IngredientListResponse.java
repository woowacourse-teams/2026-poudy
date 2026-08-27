package com.poudy.ingredient.controller.dto;

import com.poudy.ingredient.domain.MatchedIngredient;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record IngredientListResponse(
    @NotNull @Schema(description = "검색어에 일치한 성분") List<IngredientSuggestionResponse> items) {

    public static IngredientListResponse from(List<MatchedIngredient> ingredients) {
        return new IngredientListResponse(
            ingredients.stream()
                .map(IngredientSuggestionResponse::from)
                .toList()
        );
    }
}
