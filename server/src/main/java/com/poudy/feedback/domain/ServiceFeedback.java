package com.poudy.feedback.domain;

public record ServiceFeedback(FeedbackType type, FeedbackPath path) implements FeedbackSubject {
}
