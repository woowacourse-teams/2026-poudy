package com.poudy.ingredient.controller.dto;

import com.poudy.excludecode.domain.ExcludeCode;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.IngredientDetail;
import com.poudy.tag.controller.dto.FormulationRoleResponse;
import com.poudy.tag.controller.dto.SkinEffectResponse;
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
        @NotNull @Schema(description = "배합 목적 태그 (CosIng FUNCTION). 제형에서 이 성분이 맡는 역할이다. 예: 습윤제, 유화제, 보존제") List<FormulationRoleResponse> formulationRoles,
        @NotNull @Schema(description = "피부 작용 태그 (BIOLOGICAL_EFFECT). 피부에 기대할 수 있는 작용이다. 예: 피부 장벽 관련, 미백 관련, 주름 관련") List<SkinEffectResponse> skinEffects,
        @NotNull List<ExcludeCode> groupCodes,
        @NotNull @Schema(description = "이 성분을 포함한 제품 수", example = "84") Long productCount,
        @NotNull @ArraySchema(schema = @Schema(example = "성분 정보 출처")) List<String> infoSources,
        @NotNull @ArraySchema(schema = @Schema(example = "성분 효과 출처")) List<String> effectSources,
        @NotNull @Schema(example = "2026-08-01T09:30:00+09:00") OffsetDateTime updatedAt) {

    public static IngredientDetailResponse from(IngredientDetail detail) {
        Ingredient ingredient = detail.ingredient();

        // spotless:off
        return new IngredientDetailResponse(
                ingredient.id(),
                ingredient.koreanName(),
                ingredient.englishName(),
                ingredient.description(),
                ingredient.formulationRoles().stream()
                        .map(FormulationRoleResponse::from)
                        .toList(),
                ingredient.skinEffects().stream()
                        .map(SkinEffectResponse::from)
                        .toList(),
                detail.groupCodes(),
                detail.productCount(),
                ingredient.infoSources(),
                ingredient.effectSources(),
                ingredient.updatedAt());
        // spotless:on
    }
}
