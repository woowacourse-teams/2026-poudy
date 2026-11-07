package com.poudy.routine.controller.dto;

import com.poudy.routine.domain.RoutineCommentView;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;

public record RoutineCommentResponse(
    @NotNull @Schema(example = "31") Long id,
    @NotNull @Schema(example = "토너를 저녁에 먼저 쓰는 이유가 궁금해요!") String content,
    @NotNull OffsetDateTime createdAt,
    @NotNull RoutineAuthorResponse author,
    @NotNull @Schema(example = "false") Boolean byRoutineAuthor,
    @NotNull @Schema(example = "false") Boolean mine) {

    public static RoutineCommentResponse from(RoutineCommentView view) {
        return new RoutineCommentResponse(
            view.id(),
            view.content(),
            view.createdAt(),
            new RoutineAuthorResponse(view.authorNickname(), view.authorProfileImageUrl(), view.authorSkinType()),
            view.byRoutineAuthor(),
            view.mine()
        );
    }
}
