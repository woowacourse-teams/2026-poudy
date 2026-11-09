package com.poudy.skintype.domain;

/**
 * 화면에서 피부 타입 칸 하나로 고르는 값이다. 건성·지성·복합성은 {@link SkinType}이고, 민감성은 피부 타입과 따로 받는 조건이다.
 * 요청과 회원 프로필은 이 값을 받지 않으며, 응답에서 이름을 함께 줄 때만 쓴다. 표시 이름은 이 enum만 가진다.
 */
public enum SkinChoice {

    DRY("건성"),
    OILY("지성"),
    COMBINATION("복합성"),
    SENSITIVE("민감성");

    private final String displayName;

    SkinChoice(String displayName) {
        this.displayName = displayName;
    }

    public static SkinChoice from(SkinType skinType) {
        return valueOf(skinType.name());
    }

    public String getDisplayName() {
        return displayName;
    }
}
