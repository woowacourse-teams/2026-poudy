package com.poudy.tag.controller.dto;

import com.poudy.tag.domain.FormulationRole;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record FormulationRoleResponse(
        @NotNull @Schema(description = "배합 목적 ID", example = "20") Long id,
        @NotNull @Schema(description = "배합 목적 이름 (CosIng Function)", example = "보습제") String name) {

    public static FormulationRoleResponse from(FormulationRole role) {
        return new FormulationRoleResponse(role.id(), role.displayName());
    }

    public static List<FormulationRoleResponse> from(List<FormulationRole> roles) {
        return roles.stream()
                .map(FormulationRoleResponse::from)
                .toList();
    }
}
