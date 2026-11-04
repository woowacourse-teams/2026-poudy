package com.poudy.routine.controller.dto;

import com.poudy.routine.domain.RoutineCommentContent;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record RoutineCommentRequest(
    @NotNull(message = "INVALID_REQUEST_BODY") @Schema(example = "토너를 저녁에 먼저 쓰는 이유가 궁금해요!") String content) {

    public RoutineCommentContent commentContent() {
        return new RoutineCommentContent(content);
    }
}
