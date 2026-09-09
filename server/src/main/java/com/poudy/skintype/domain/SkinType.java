package com.poudy.skintype.domain;

public enum SkinType {

    DRY("건성"),
    OILY("지성"),
    SENSITIVE("민감성"),
    COMBINATION("복합성");

    private final String displayName;

    SkinType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
