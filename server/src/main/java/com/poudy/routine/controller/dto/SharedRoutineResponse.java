package com.poudy.routine.controller.dto;

import com.poudy.routine.domain.SharedRoutineView;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record SharedRoutineResponse(
    @NotNull @Schema(example = "12") Long id,
    @NotNull @Schema(example = "트러블 진정 저녁") String name,
    @NotNull RoutineAuthorResponse author,
    @NotNull @Schema(example = "24") Long likeCount,
    @NotNull @Schema(example = "5") Long commentCount,
    @NotNull List<RoutineProductResponse> morning,
    @NotNull List<RoutineProductResponse> evening) {

    public static SharedRoutineResponse from(SharedRoutineView view) {
        return new SharedRoutineResponse(
            view.id(),
            view.name(),
            new RoutineAuthorResponse(view.authorNickname(), view.authorProfileImageUrl(), view.authorSkinType()),
            view.likeCount(),
            view.commentCount(),
            RoutineProductResponse.listOf(view.morning()),
            RoutineProductResponse.listOf(view.evening())
        );
    }
}
