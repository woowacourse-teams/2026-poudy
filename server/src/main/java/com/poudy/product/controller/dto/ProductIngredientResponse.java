package com.poudy.product.controller.dto;

import com.poudy.tag.controller.dto.FormulationRoleResponse;
import com.poudy.tag.controller.dto.SkinEffectResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ProductIngredientResponse(
        @NotNull @Schema(example = "1005") Long id,
        @NotNull @Schema(example = "글리세린") String koreanName,
        @NotNull @Schema(example = "Glycerin") String englishName,
        @NotNull @Schema(description = "배합 목적 태그 (CosIng FUNCTION). 제형에서 이 성분이 맡는 역할이다. 예: 습윤제, 유화제, 보존제") List<FormulationRoleResponse> formulationRoles,
        @NotNull @Schema(description = "피부 작용 태그 (BIOLOGICAL_EFFECT). 피부에 기대할 수 있는 작용이다. 예: 피부 장벽 관련, 미백 관련, 주름 관련") List<SkinEffectResponse> skinEffects,
        @Schema(description = "공개된 함량. 공개하지 않은 성분은 비어 있다") DisclosedAmountResponse disclosedAmount) {

    public static List<ProductIngredientResponse> samples() {
        return List.of(
                new ProductIngredientResponse(
                        1001L,
                        "정제수",
                        "Water",
                        List.of(new FormulationRoleResponse(3L, "용제")),
                        List.of(),
                        null),
                new ProductIngredientResponse(
                        1005L,
                        "글리세린",
                        "Glycerin",
                        List.of(new FormulationRoleResponse(1L, "습윤제"), new FormulationRoleResponse(2L, "피부 컨디셔닝제")),
                        List.of(new SkinEffectResponse(21L, "피부 장벽 관련")),
                        DisclosedAmountResponse.sample()));
    }
}
