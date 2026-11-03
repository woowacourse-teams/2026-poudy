package com.poudy.product.controller.dto;

import com.poudy.tag.domain.SkinEffect;
import jakarta.validation.constraints.NotNull;

public record ProductComparisonEffectResponse(@NotNull String code, @NotNull String name) {

    public static ProductComparisonEffectResponse from(SkinEffect effect) {
        return new ProductComparisonEffectResponse(effect.code(), effect.displayName());
    }
}
