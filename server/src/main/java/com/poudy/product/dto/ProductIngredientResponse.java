package com.poudy.product.dto;

import com.poudy.ingredient.dto.EffectResponse;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ProductIngredientResponse(@NotNull Long id, @NotNull String koreanName, @NotNull String englishName,
        @NotNull List<EffectResponse> effects) {
}
