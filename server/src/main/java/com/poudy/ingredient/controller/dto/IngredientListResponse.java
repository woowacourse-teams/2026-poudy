package com.poudy.ingredient.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record IngredientListResponse(@NotNull @Schema(description = "검색어에 해당하는 성분") List<IngredientResponse> items) {
}
