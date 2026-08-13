package com.poudy.ingredient.dto;

import com.poudy.ingredient.domain.ExcludeCode;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;
import java.util.List;

public record IngredientDetailResponse(@NotNull Long id, @NotNull String koreanName, @NotNull String englishName,
        @NotNull String description, @NotNull List<EffectResponse> effects, @NotNull List<ExcludeCode> groupCodes,
        @NotNull Long productCount, @NotNull List<String> infoSources, @NotNull List<String> effectSources,
        @NotNull List<IngredientSummaryResponse> relatedIngredients, @NotNull OffsetDateTime updatedAt) {
}
