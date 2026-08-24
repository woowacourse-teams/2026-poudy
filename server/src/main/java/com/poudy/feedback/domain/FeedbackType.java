package com.poudy.feedback.domain;

public enum FeedbackType {

    BUG_REPORT("기능이 제대로 작동하지 않아요"),
    DATA_CORRECTION("정보가 잘못됐어요"),
    IMPROVEMENT("개선했으면 좋겠어요"),
    OTHER("기타 의견");

    private final String displayName;

    FeedbackType(String displayName) {
        this.displayName = displayName;
    }

    public String displayName() {
        return displayName;
    }
}
