package com.poudy.user.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record NicknameAvailabilityResponse(
    @NotNull @Schema(example = "true") Boolean available) {
}
