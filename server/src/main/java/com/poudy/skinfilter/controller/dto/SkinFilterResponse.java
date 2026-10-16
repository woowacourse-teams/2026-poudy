package com.poudy.skinfilter.controller.dto;

import com.poudy.skinfilter.domain.SkinFilterIngredient;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record SkinFilterResponse(@NotNull List<SkinFilterIngredientResponse> items) {

    public static SkinFilterResponse from(List<SkinFilterIngredient> ingredients) {
        return new SkinFilterResponse(ingredients.stream().map(SkinFilterIngredientResponse::from).toList());
    }
}
