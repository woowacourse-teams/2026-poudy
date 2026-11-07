package com.poudy.routine.controller.dto;

import com.poudy.routine.domain.OwnedRoutineView;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record RoutineSummaryResponse(
    @NotNull @Schema(example = "12") Long id,
    @NotNull @Schema(example = "평소 루틴") String name,
    @NotNull @Schema(example = "true") Boolean isPublic,
    @NotNull @Schema(example = "41") Long likeCount,
    @NotNull @Schema(example = "3") Long commentCount,
    @NotNull List<RoutineProductResponse> morning,
    @NotNull List<RoutineProductResponse> evening) {

    public static RoutineSummaryResponse from(OwnedRoutineView view) {
        return new RoutineSummaryResponse(
            view.id(),
            view.name(),
            view.isPublic(),
            view.likeCount(),
            view.commentCount(),
            RoutineProductResponse.listOf(view.morning()),
            RoutineProductResponse.listOf(view.evening())
        );
    }
}
