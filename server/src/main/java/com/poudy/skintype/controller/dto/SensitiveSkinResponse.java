package com.poudy.skintype.controller.dto;

import com.poudy.skintype.domain.SkinOptions;
import jakarta.validation.constraints.NotNull;

public record SensitiveSkinResponse(@NotNull String name) {

    public static SensitiveSkinResponse from() {
        return new SensitiveSkinResponse(SkinOptions.sensitiveSkinName());
    }
}
