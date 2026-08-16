package com.poudy.tag.controller.dto;

import com.poudy.tag.domain.SkinEffect;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record SkinEffectResponse(
        @NotNull @Schema(description = "피부 작용 ID", example = "108") Long id,
        @NotNull @Schema(description = "피부 작용 이름", example = "수분 공급 관련") String name) {

    public static SkinEffectResponse from(SkinEffect effect) {
        return new SkinEffectResponse(effect.id(), effect.displayName());
    }

    public static List<SkinEffectResponse> from(List<SkinEffect> effects) {
        // spotless:off
        return effects.stream()
                .map(SkinEffectResponse::from)
                .toList();
        // spotless:on
    }
}
