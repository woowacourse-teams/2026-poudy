package com.poudy.ingredientgroup.controller.dto;

import com.poudy.ingredientgroup.domain.IngredientGroupSuggestion;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record IngredientGroupSuggestionResponse(
    @NotNull @Schema(example = "CERAMIDES") String code,
    @NotNull @Schema(example = "세라마이드") String name,
    @NotNull @ArraySchema(schema = @Schema(example = "7130")) List<Long> ingredientIds) {

    public static IngredientGroupSuggestionResponse from(IngredientGroupSuggestion suggestion) {
        return new IngredientGroupSuggestionResponse(suggestion.code(), suggestion.name(), suggestion.ingredientIds());
    }
}
