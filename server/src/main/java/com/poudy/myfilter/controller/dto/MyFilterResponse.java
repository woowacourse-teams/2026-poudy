package com.poudy.myfilter.controller.dto;

import com.poudy.myfilter.domain.MyFilterIngredient;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record MyFilterResponse(@NotNull List<MyFilterIngredientResponse> items) {

    public static MyFilterResponse from(List<MyFilterIngredient> ingredients) {
        return new MyFilterResponse(ingredients.stream().map(MyFilterIngredientResponse::from).toList());
    }
}
