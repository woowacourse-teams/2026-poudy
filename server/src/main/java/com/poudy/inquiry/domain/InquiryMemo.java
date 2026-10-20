package com.poudy.inquiry.domain;

import java.time.OffsetDateTime;
import java.util.UUID;

public record InquiryMemo(UUID id, String content, OffsetDateTime createdAt) {
}
