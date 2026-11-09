package com.poudy.routine.controller.dto;

import com.poudy.routine.domain.SharedRoutineView;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record SharedRoutineListResponse(@NotNull List<SharedRoutineResponse> items) {

    public static SharedRoutineListResponse from(List<SharedRoutineView> views) {
        return new SharedRoutineListResponse(views.stream().map(SharedRoutineResponse::from).toList());
    }
}
