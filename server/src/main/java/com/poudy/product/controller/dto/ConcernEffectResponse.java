package com.poudy.product.controller.dto;

import com.poudy.tag.domain.SkinEffect;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record ConcernEffectResponse(
    @NotNull @Schema(description = "피부 작용 코드 (BIOLOGICAL_EFFECT)", example = "BARRIER_SUPPORT_RELATED") String code,
    @NotNull @Schema(description = "피부 작용 표시명", example = "피부 장벽 관련") String name) {

    static ConcernEffectResponse from(SkinEffect effect) {
        return new ConcernEffectResponse(
            effect.code(),
            effect.displayName()
        );
    }
}
