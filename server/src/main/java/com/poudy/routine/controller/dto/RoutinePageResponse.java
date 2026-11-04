package com.poudy.routine.controller.dto;

import com.poudy.common.dto.PaginationRequest;
import com.poudy.common.dto.PaginationResponse;
import com.poudy.routine.domain.RoutineViewPage;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record RoutinePageResponse(
    @NotNull List<RoutineSummaryResponse> items,
    @NotNull PaginationResponse pagination) {

    public static RoutinePageResponse from(RoutineViewPage page, PaginationRequest pagination) {
        return new RoutinePageResponse(
            page.items().stream().map(RoutineSummaryResponse::from).toList(),
            PaginationResponse.of(pagination, page.totalElements())
        );
    }
}
