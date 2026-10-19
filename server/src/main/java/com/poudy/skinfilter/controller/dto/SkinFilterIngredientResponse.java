package com.poudy.skinfilter.controller.dto;

import com.poudy.excludecode.domain.ExcludeCode;
import com.poudy.skinfilter.domain.SkinFilterIngredient;
import com.poudy.tag.controller.dto.FormulationRoleResponse;
import com.poudy.tag.controller.dto.SkinEffectResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record SkinFilterIngredientResponse(
    @NotNull @Schema(example = "3551") Long id,
    @NotNull @Schema(example = "페녹시에탄올") String koreanName,
    @NotNull List<FormulationRoleResponse> formulationRoles,
    @NotNull List<SkinEffectResponse> skinEffects,
    @NotNull @Schema(description = "이 성분이 속한 제외 성분군 코드") List<ExcludeCode> excludeCodes) {

    public static SkinFilterIngredientResponse from(SkinFilterIngredient filterIngredient) {
        return new SkinFilterIngredientResponse(
            filterIngredient.ingredient().id(),
            filterIngredient.ingredient().koreanName(),
            FormulationRoleResponse.from(filterIngredient.ingredient().formulationRoles()),
            SkinEffectResponse.from(filterIngredient.ingredient().skinEffects()),
            filterIngredient.excludeCodes()
        );
    }
}
