package com.poudy.pushtoken.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record PushTokenResponse(@NotNull @Schema(example = "true") Boolean enabled) {
}
