package com.poudy.product.controller.dto;

import com.poudy.product.domain.Badge;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record BadgeResponse(
    @NotNull @Schema(description = "배지 코드", example = "DAISO") String code,
    @NotNull @Schema(description = "배지 표시명", example = "다이소") String name) {

    public static List<BadgeResponse> from(List<Badge> badges) {
        return badges.stream().map(badge -> new BadgeResponse(badge.code(), badge.name())).toList();
    }
}
