package com.poudy.routine.controller.dto;

import com.poudy.routine.domain.RoutineCommentViewPage;
import com.poudy.routine.domain.SharedRoutineView;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record SharedRoutineDetailResponse(
    @NotNull @Schema(example = "12") Long id,
    @NotNull @Schema(example = "트러블 진정 저녁") String name,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED, example = "트러블이 올라온 날 저녁에 쓰는 루틴이에요.") String memo,
    @NotNull RoutineAuthorResponse author,
    @NotNull @Schema(example = "24") Long likeCount,
    @NotNull @Schema(example = "5") Long commentCount,
    @NotNull @Schema(example = "false") Boolean liked,
    @NotNull List<RoutineCommentResponse> comments,
    @NotNull List<RoutineProductResponse> morning,
    @NotNull List<RoutineProductResponse> evening) {

    public static SharedRoutineDetailResponse from(
        SharedRoutineView view,
        boolean liked,
        RoutineCommentViewPage preview
    ) {
        return new SharedRoutineDetailResponse(
            view.id(),
            view.name(),
            view.memo(),
            new RoutineAuthorResponse(view.authorNickname(), view.authorProfileImageUrl(), view.authorSkinType()),
            view.likeCount(),
            view.commentCount(),
            liked,
            preview.comments().stream().map(RoutineCommentResponse::from).toList(),
            RoutineProductResponse.listOf(view.morning()),
            RoutineProductResponse.listOf(view.evening())
        );
    }
}
