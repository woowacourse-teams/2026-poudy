package com.poudy.shelf.domain;

public enum IngredientAnalysisReason {

    QUICK_EXCLUDE("알레르기·자극 주의 후보"),
    DRY_SKIN("건성 피부 주의 후보"),
    OILY_SKIN("지성 피부 주의 후보"),
    SENSITIVE_SKIN("민감성 피부 주의 후보"),
    WEAK_EVIDENCE("자극 보고가 있는 성분");

    private final String displayName;

    IngredientAnalysisReason(String displayName) {
        this.displayName = displayName;
    }

    public boolean isSkinCaution() {
        return this != QUICK_EXCLUDE && this != WEAK_EVIDENCE;
    }

    public boolean isWeakEvidence() {
        return this == WEAK_EVIDENCE;
    }

    public String displayName() {
        return displayName;
    }
}
