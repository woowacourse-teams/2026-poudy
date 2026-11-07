package com.poudy.routine.controller.dto;

import com.poudy.common.dto.PaginationRequest;
import com.poudy.common.dto.PaginationResponse;
import com.poudy.routine.domain.RoutineCommentViewPage;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record RoutineCommentPageResponse(
    @NotNull List<RoutineCommentResponse> items,
    @NotNull PaginationResponse pagination,
    @NotNull @Schema(example = "true") Boolean writable) {

    public static RoutineCommentPageResponse from(RoutineCommentViewPage page, PaginationRequest pagination) {
        return new RoutineCommentPageResponse(
            page.comments().stream().map(RoutineCommentResponse::from).toList(),
            PaginationResponse.of(pagination, page.totalElements()),
            page.writable()
        );
    }
}
