package com.poudy.inquiry.domain;

import com.poudy.feedback.domain.FeedbackStatus;
import java.time.OffsetDateTime;

public record InquiryQuery(
    String q,
    FeedbackStatus status,
    String type,
    Boolean assigned,
    OffsetDateTime from,
    OffsetDateTime to,
    Boolean oldest) {
    public InquiryQuery {
        oldest = java.util.Objects.requireNonNullElse(oldest, false);
    }
}
