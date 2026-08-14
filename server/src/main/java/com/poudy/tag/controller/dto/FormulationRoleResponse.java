package com.poudy.tag.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record FormulationRoleResponse(
        @NotNull @Schema(description = "배합 목적 ID", example = "1") Long id,
        @NotNull @Schema(description = "배합 목적 이름 (CosIng Function)", example = "습윤제") String name) {
}
