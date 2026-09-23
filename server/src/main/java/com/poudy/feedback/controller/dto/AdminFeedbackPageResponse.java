package com.poudy.feedback.controller.dto;

import com.poudy.common.dto.PaginationRequest;
import com.poudy.common.dto.PaginationResponse;
import com.poudy.feedback.domain.FeedbackPage;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record AdminFeedbackPageResponse(
    @NotNull List<AdminFeedbackResponse> items,
    @NotNull PaginationResponse pagination) {

    public static AdminFeedbackPageResponse from(FeedbackPage page, PaginationRequest pagination) {
        return new AdminFeedbackPageResponse(
            page.items().stream().map(AdminFeedbackResponse::from).toList(),
            PaginationResponse.of(pagination, page.totalElements())
        );
    }
}
