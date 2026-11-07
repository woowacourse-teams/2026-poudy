package com.poudy.product.controller.dto;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@JsonPropertyOrder({"type", "id", "koreanName"})
public record IngredientItemResponse(
    @NotNull @Schema(example = "3500") Long id,
    @NotNull @Schema(example = "판테놀") String koreanName) implements ConcernItemResponse {

    @NotNull
    @Schema(allowableValues = "INGREDIENT", example = "INGREDIENT")
    public String getType() {
        return "INGREDIENT";
    }
}
