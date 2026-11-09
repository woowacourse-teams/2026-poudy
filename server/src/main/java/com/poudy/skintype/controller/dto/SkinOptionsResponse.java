package com.poudy.skintype.controller.dto;

import com.poudy.skintype.domain.SkinType;
import jakarta.validation.constraints.NotNull;
import java.util.Arrays;
import java.util.List;

public record SkinOptionsResponse(
    @NotNull List<SkinTypeResponse> skinTypes,
    @NotNull SensitiveSkinResponse sensitiveSkin) {

    public static SkinOptionsResponse from() {
        return new SkinOptionsResponse(
            Arrays.stream(SkinType.values()).map(SkinTypeResponse::from).toList(),
            SensitiveSkinResponse.from()
        );
    }
}
