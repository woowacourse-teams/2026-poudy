package com.poudy.skinfilter.controller.dto;

import com.poudy.ingredient.domain.Ingredients;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record SkinFilterResponse(@NotNull List<SkinFilterIngredientResponse> items) {

    public static SkinFilterResponse from(Ingredients ingredients) {
        return new SkinFilterResponse(ingredients.values().stream().map(SkinFilterIngredientResponse::from).toList());
    }
}
