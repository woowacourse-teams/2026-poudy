package com.poudy.tag.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record SkinEffectResponse(
        @NotNull @Schema(description = "피부 작용 ID", example = "21") Long id,
        @NotNull @Schema(description = "피부 작용 이름", example = "피부 장벽 관련") String name) {
}
