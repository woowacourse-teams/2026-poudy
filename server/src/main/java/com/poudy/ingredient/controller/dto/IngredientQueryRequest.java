package com.poudy.ingredient.controller.dto;

import com.poudy.ingredient.service.IngredientQuery;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.Objects;
import org.hibernate.validator.constraints.UniqueElements;

public record IngredientQueryRequest(
    @UniqueElements @ArraySchema(schema = @Schema(implementation = Long.class, example = "2"), uniqueItems = true) List<@NotNull Long> ingredientIds) {

    public IngredientQueryRequest {
        ingredientIds = Objects.requireNonNullElse(ingredientIds, List.of());
    }

    public IngredientQuery toQuery() {
        return new IngredientQuery(ingredientIds);
    }
}
