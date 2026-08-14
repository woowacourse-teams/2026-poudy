package com.poudy.ingredient.controller.dto;

import com.poudy.excludecode.domain.ExcludeCode;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;
import java.util.List;

public record IngredientDetailResponse(
        @NotNull @Schema(example = "1005") Long id,
        @NotNull @Schema(example = "글리세린") String koreanName,
        @NotNull @Schema(example = "Glycerin") String englishName,
        @NotNull @Schema(example = "피부 표면의 수분을 끌어당겨 유지시키는 대표적인 보습 성분이다.") String description,
        @NotNull List<EffectResponse> effects,
        @NotNull List<ExcludeCode> groupCodes,
        @NotNull @Schema(example = "84") Long productCount,
        @NotNull @ArraySchema(schema = @Schema(example = "성분 정보 출처")) List<String> infoSources,
        @NotNull @ArraySchema(schema = @Schema(example = "성분 효과 출처")) List<String> effectSources,
        @NotNull List<IngredientSummaryResponse> relatedIngredients,
        @NotNull @Schema(example = "2026-08-01T09:30:00+09:00") OffsetDateTime updatedAt) {
}
