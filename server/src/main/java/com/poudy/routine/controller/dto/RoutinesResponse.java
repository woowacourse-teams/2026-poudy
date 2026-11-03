package com.poudy.routine.controller.dto;

import com.poudy.routine.domain.RoutineView;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record RoutinesResponse(@NotNull List<RoutineSummaryResponse> items) {

    public static RoutinesResponse from(List<RoutineView> views) {
        return new RoutinesResponse(views.stream().map(RoutineSummaryResponse::from).toList());
    }
}
