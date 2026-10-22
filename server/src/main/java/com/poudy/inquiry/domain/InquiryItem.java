package com.poudy.inquiry.domain;

import com.poudy.feedback.domain.FeedbackStatus;
import java.time.OffsetDateTime;
import java.util.UUID;

public record InquiryItem(
    InquiryKind kind,
    UUID id,
    String type,
    String content,
    String productName,
    String brandName,
    String path,
    FeedbackStatus status,
    boolean assigned,
    OffsetDateTime receivedAt,
    OffsetDateTime updatedAt) {
}
