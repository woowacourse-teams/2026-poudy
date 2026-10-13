package com.poudy.ingredientgroup.controller.dto;

import com.poudy.ingredientgroup.domain.IngredientGroupDetail;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record IngredientGroupListResponse(@NotNull List<IngredientGroupResponse> items) {

    public static IngredientGroupListResponse from(List<IngredientGroupDetail> groups) {
        return new IngredientGroupListResponse(groups.stream().map(IngredientGroupResponse::from).toList());
    }
}
