package com.poudy.feedback.domain;

public enum FeedbackSubjectType {

    BUG_REPORT,
    IMPROVEMENT,
    OTHER,
    PRODUCT_CORRECTION;

    public static FeedbackSubjectType from(FeedbackSubject subject) {
        return switch (subject) {
            case ServiceFeedback service -> valueOf(service.type().name());
            case ProductCorrection ignored -> PRODUCT_CORRECTION;
        };
    }
}
