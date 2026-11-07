package com.poudy.product.controller.dto;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import com.poudy.ingredient.controller.dto.IngredientNameResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;

@JsonPropertyOrder({"type", "code", "name", "ingredients"})
public record IngredientGroupItemResponse(
    @NotNull @Schema(example = "CERAMIDES") String code,
    @NotNull @Schema(example = "세라마이드 계열") String name,
    @NotNull @Valid @Schema(example = """
        [{"id":7130,"koreanName":"세라마이드엔피"},{"id":7131,"koreanName":"세라마이드에이피"}]
        """) List<IngredientNameResponse> ingredients) implements ConcernItemResponse {

    public IngredientGroupItemResponse {
        ingredients = List.copyOf(ingredients);
    }

    @NotNull
    @Schema(allowableValues = "INGREDIENT_GROUP", example = "INGREDIENT_GROUP")
    public String getType() {
        return "INGREDIENT_GROUP";
    }
}
