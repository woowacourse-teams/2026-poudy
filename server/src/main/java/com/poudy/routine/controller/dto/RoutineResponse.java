package com.poudy.routine.controller.dto;

import com.poudy.routine.domain.RoutineView;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record RoutineResponse(
    @NotNull @Schema(example = "12") Long id,
    @NotNull @Schema(example = "평소 루틴") String name,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED, example = "평일 출근 전후로 쓰는 기본 루틴이에요.") String memo,
    @NotNull @Schema(example = "true") Boolean isPublic,
    @NotNull @Schema(description = "탈퇴하지 않은 회원이 누른 좋아요 수", example = "5") Long likeCount,
    @NotNull List<RoutineProductResponse> morning,
    @NotNull List<RoutineProductResponse> evening) {

    public static RoutineResponse from(RoutineView view) {
        return new RoutineResponse(
            view.id(),
            view.name(),
            view.memo(),
            view.isPublic(),
            view.likeCount(),
            RoutineProductResponse.listOf(view.morning()),
            RoutineProductResponse.listOf(view.evening())
        );
    }
}
