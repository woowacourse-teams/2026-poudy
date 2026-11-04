package com.poudy.routine.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record RoutineImportRequest(@NotNull(message = "INVALID_REQUEST_BODY") @Schema(example = "12") Long routineId) {
}
