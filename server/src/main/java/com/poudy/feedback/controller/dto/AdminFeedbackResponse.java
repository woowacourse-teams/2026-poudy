package com.poudy.feedback.controller.dto;

import com.poudy.feedback.domain.Feedback;
import com.poudy.feedback.domain.FeedbackStatus;
import com.poudy.feedback.domain.FeedbackSubjectType;
import com.poudy.feedback.domain.ProductCorrection;
import com.poudy.feedback.domain.ServiceFeedback;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record AdminFeedbackResponse(
    @NotNull UUID feedbackId,
    @NotNull FeedbackSubjectType type,
    @NotNull String content,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) String path,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) Long productId,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) String productName,
    @NotNull OffsetDateTime receivedAt,
    @NotNull FeedbackStatus status,
    @NotNull OffsetDateTime statusChangedAt,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) OffsetDateTime completedAt,
    @NotNull List<AdminFeedbackImageResponse> images) {

    public static AdminFeedbackResponse from(Feedback feedback) {
        AdminFeedbackSubjectResponse subject = AdminFeedbackSubjectResponse.from(feedback);
        return new AdminFeedbackResponse(
            feedback.id(),
            feedback.type(),
            feedback.content().value(),
            subject.path(),
            subject.productId(),
            subject.productName(),
            feedback.receivedAt(),
            feedback.status(),
            feedback.statusChangedAt(),
            feedback.completedAt(),
            feedback.images().stream().map(AdminFeedbackImageResponse::from).toList()
        );
    }

    private record AdminFeedbackSubjectResponse(String path, Long productId, String productName) {

        private static AdminFeedbackSubjectResponse from(Feedback feedback) {
            return switch (feedback) {
                case ServiceFeedback service -> new AdminFeedbackSubjectResponse(
                    service.path().value().orElse(null),
                    null,
                    null
                );
                case ProductCorrection correction -> new AdminFeedbackSubjectResponse(
                    null,
                    correction.productId(),
                    correction.productName()
                );
            };
        }
    }
}
