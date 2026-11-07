package com.poudy.shelf.domain;

public enum IngredientAnalysisReason {

    QUICK_EXCLUDE("빠른 제외 성분"),
    DRY_SKIN("건성 피부 주의 후보"),
    OILY_SKIN("지성 피부 주의 후보"),
    SENSITIVE_SKIN("민감성 피부 주의 후보");

    private final String displayName;

    IngredientAnalysisReason(String displayName) {
        this.displayName = displayName;
    }

    public boolean isSkinCaution() {
        return this != QUICK_EXCLUDE;
    }

    public String displayName() {
        return displayName;
    }
}
