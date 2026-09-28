package com.poudy.feedback.controller.dto;

import com.poudy.feedback.domain.FeedbackStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record AdminFeedbackStatusUpdateRequest(
    @NotNull(message = "INVALID_REQUEST_BODY") @Schema(example = "IN_PROGRESS") FeedbackStatus status) {
}
