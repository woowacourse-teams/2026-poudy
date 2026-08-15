package com.poudy.excludecode.domain;

import java.util.List;

public enum ExcludeCode {

    FRAGRANCE_ALLERGENS("향료/알레르기 성분 제외", "향료와 알레르기 유발 향료 성분을 제외합니다.",
            List.of(
                    "향료",
                    "리날룰",
                    "리모넨",
                    "시트랄",
                    "시트로넬올",
                    "제라니올",
                    "부틸페닐메틸프로피오날",
                    "벤질살리실레이트",
                    "알파-아이소메틸아이오논",
                    "헥실신남알",
                    "유제놀",
                    "아밀신남알",
                    "쿠마린")),
    DRYING_ALCOHOLS("건조 알코올 제외", "피부를 건조하게 만들 수 있는 알코올 성분을 제외합니다.", List.of("변성알코올", "에탄올", "아이소프로필알코올", "에스디알코올40-B")),
    HARSH_PRESERVATIVES("자극성 방부제 제외", "자극을 유발할 수 있는 방부제 성분을 제외합니다.",
            List.of(
                    "페녹시에탄올",
                    "메틸파라벤",
                    "에틸파라벤",
                    "프로필파라벤",
                    "부틸파라벤",
                    "아이소부틸파라벤",
                    "아이소프로필파라벤",
                    "비에이치에이",
                    "비에이치티",
                    "디엠디엠하이단토인")),
    SULFATES("설페이트 성분 제외", "설페이트 계열 계면활성제 성분을 제외합니다.", List.of("소듐라우릴설페이트", "소듐라우레스설페이트", "암모늄라우릴설페이트", "암모늄라우레스설페이트")),
    CYCLIC_SILICONES("실리콘 자극원 제외", "환상형 실리콘 성분을 제외합니다.", List.of("사이클로테트라실록세인", "사이클로펜타실록세인", "사이클로헥사실록세인", "사이클로메티콘")),
    SYNTHETIC_COLORANTS("합성 색소 제외", "합성 색소 성분을 제외합니다.", List.of());

    private final String displayName;
    private final String description;
    private final List<String> ingredientNames;

    ExcludeCode(String displayName, String description, List<String> ingredientNames) {
        this.displayName = displayName;
        this.description = description;
        this.ingredientNames = List.copyOf(ingredientNames);
    }

    public String displayName() {
        return displayName;
    }

    public String description() {
        return description;
    }

    public List<String> ingredientNames() {
        return ingredientNames;
    }
}
