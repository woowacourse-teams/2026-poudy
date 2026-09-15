package com.poudy.feedback.domain;

public sealed interface FeedbackSubject permits ServiceFeedback, ProductCorrection {
}
