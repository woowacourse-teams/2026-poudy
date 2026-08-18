package com.poudy.product.domain.sensory;

public record SensoryModelVersion(
        String ingredientProfileVersion,
        String categoryPriorVersion,
        String levelModelVersion) {

    public SensoryModelVersion {
        ingredientProfileVersion = requireNonBlank(ingredientProfileVersion, "성분 감각 프로필");
        categoryPriorVersion = requireNonBlank(categoryPriorVersion, "카테고리 배합 사전분포");
        levelModelVersion = requireNonBlank(levelModelVersion, "감각 레벨 모델");
    }

    private static String requireNonBlank(String version, String name) {
        if (version == null || version.isBlank()) {
            throw new IllegalArgumentException(name + " 버전이 필요합니다.");
        }

        return version;
    }
}
