package com.poudy.inquiry.domain;

import java.time.OffsetDateTime;
import java.util.UUID;

public record InquiryEvent(
    UUID id,
    String type,
    String previousValue,
    String currentValue,
    String memo,
    OffsetDateTime occurredAt) {
}
