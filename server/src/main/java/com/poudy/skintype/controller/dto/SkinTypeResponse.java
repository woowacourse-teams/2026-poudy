package com.poudy.skintype.controller.dto;

import com.poudy.skintype.domain.SkinType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record SkinTypeResponse(
    @NotNull @Schema(description = "피부타입 코드", example = "DRY") SkinType code,
    @NotNull @Schema(description = "피부타입 표시명", example = "건성") String name) {

    public static SkinTypeResponse from(SkinType skinType) {
        return new SkinTypeResponse(skinType, skinType.displayName());
    }
}
