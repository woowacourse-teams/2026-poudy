package com.poudy.routine.controller.dto;

import com.poudy.common.dto.PaginationRequest;
import com.poudy.common.dto.PaginationResponse;
import com.poudy.routine.domain.SharedRoutineViewPage;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record SharedRoutinePageResponse(
    @NotNull List<SharedRoutineResponse> items,
    @NotNull PaginationResponse pagination) {

    public static SharedRoutinePageResponse from(SharedRoutineViewPage page, PaginationRequest pagination) {
        return new SharedRoutinePageResponse(
            page.items().stream().map(SharedRoutineResponse::from).toList(),
            PaginationResponse.of(pagination, page.totalElements())
        );
    }
}
