package com.poudy.feedback.domain;

public record ProductCorrection(Long productId, String productName) implements FeedbackSubject {
}
