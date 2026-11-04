package com.poudy.routine.controller.dto;

import com.poudy.routine.domain.RoutineView;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record RoutineSummaryResponse(
    @NotNull @Schema(example = "12") Long id,
    @NotNull @Schema(example = "평소 루틴") String name,
    @NotNull @Schema(example = "true") Boolean isPublic,
    @NotNull List<RoutineProductResponse> morning,
    @NotNull List<RoutineProductResponse> evening) {

    public static RoutineSummaryResponse from(RoutineView view) {
        return new RoutineSummaryResponse(
            view.id(),
            view.name(),
            view.isPublic(),
            RoutineProductResponse.listOf(view.morning()),
            RoutineProductResponse.listOf(view.evening())
        );
    }
}
