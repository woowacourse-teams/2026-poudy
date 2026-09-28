package com.poudy.ingredient.controller.dto;

import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.Objects;
import org.hibernate.validator.constraints.UniqueElements;

public record IngredientQueryRequest(
    @UniqueElements @ArraySchema(schema = @Schema(implementation = Long.class, example = "2"), uniqueItems = true) List<@NotNull Long> ingredientIds,
    @Schema(example = "true") Boolean usedInProducts) {

    public IngredientQueryRequest {
        ingredientIds = Objects.requireNonNullElse(ingredientIds, List.of());
        usedInProducts = Objects.requireNonNullElse(usedInProducts, false);
    }
}
