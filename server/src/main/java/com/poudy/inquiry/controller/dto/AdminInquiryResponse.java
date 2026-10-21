package com.poudy.inquiry.controller.dto;

import com.poudy.feedback.domain.FeedbackStatus;
import com.poudy.inquiry.domain.InquiryItem;
import com.poudy.inquiry.domain.InquiryKind;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;
import java.util.UUID;

public record AdminInquiryResponse(
    @NotNull InquiryKind kind,
    @NotNull UUID id,
    @NotNull String type,
    @NotNull String content,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) String productName,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) String brandName,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) String path,
    @NotNull FeedbackStatus status,
    @NotNull Boolean assigned,
    @NotNull OffsetDateTime receivedAt,
    @NotNull OffsetDateTime updatedAt) {
    public static AdminInquiryResponse from(InquiryItem i) {
        return new AdminInquiryResponse(
            i.kind(),
            i.id(),
            i.type(),
            i.content(),
            i.productName(),
            i.brandName(),
            i.path(),
            i.status(),
            i.assigned(),
            i.receivedAt(),
            i.updatedAt()
        );
    }
}
