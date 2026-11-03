package com.poudy.routine.controller.dto;

import com.poudy.routine.domain.RoutineMemo;
import com.poudy.routine.domain.RoutineName;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record RoutineUpdateRequest(
    @NotNull(message = "INVALID_REQUEST_BODY") @Schema(example = "저녁 진정 루틴") String name,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED, example = "트러블이 올라온 날 저녁에 써요.") String memo,
    @NotNull(message = "INVALID_REQUEST_BODY") @Schema(example = "true") Boolean isPublic) {

    public RoutineName routineName() {
        return new RoutineName(name);
    }

    public RoutineMemo routineMemo() {
        return new RoutineMemo(memo);
    }
}
