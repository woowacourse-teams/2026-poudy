package com.poudy.excludecode.domain;

public enum ExcludeCode {

    FRAGRANCE_ALLERGENS("향료/알레르기 성분 제외", "향료와 알레르기 유발 향료 성분을 제외합니다."),
    DRYING_ALCOHOLS("건조 알코올 제외", "피부를 건조하게 만들 수 있는 알코올 성분을 제외합니다."),
    HARSH_PRESERVATIVES("자극성 방부제 제외", "자극을 유발할 수 있는 방부제 성분을 제외합니다."),
    SULFATES("설페이트 성분 제외", "설페이트 계열 계면활성제 성분을 제외합니다."),
    CYCLIC_SILICONES("실리콘 자극원 제외", "환상형 실리콘 성분을 제외합니다."),
    SYNTHETIC_COLORANTS("합성 색소 제외", "합성 색소 성분을 제외합니다.");

    private final String displayName;
    private final String description;

    ExcludeCode(String displayName, String description) {
        this.displayName = displayName;
        this.description = description;
    }

    public String displayName() {
        return displayName;
    }

    public String description() {
        return description;
    }
}
