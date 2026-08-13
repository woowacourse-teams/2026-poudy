package com.poudy.ingredient.dto;

import com.poudy.ingredient.domain.ExcludeCode;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record IngredientResponse(@NotNull Long id, @NotNull String koreanName, @NotNull String englishName,
        @NotNull List<EffectResponse> effects, @NotNull List<ExcludeCode> groupCodes) {
}
