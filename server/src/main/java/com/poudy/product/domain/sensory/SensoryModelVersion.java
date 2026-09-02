package com.poudy.product.domain.sensory;

import java.util.Objects;

public final class SensoryModelVersion {

    private final String ingredientProfileVersion;
    private final String categoryPriorVersion;
    private final String levelModelVersion;

    public SensoryModelVersion(
        String ingredientProfileVersion,
        String categoryPriorVersion,
        String levelModelVersion
    ) {
        this.ingredientProfileVersion = requireNonBlank(ingredientProfileVersion, "성분 감각 프로필");
        this.categoryPriorVersion = requireNonBlank(categoryPriorVersion, "카테고리 배합 사전분포");
        this.levelModelVersion = requireNonBlank(levelModelVersion, "감각 레벨 모델");
    }

    public String ingredientProfileVersion() {
        return ingredientProfileVersion;
    }

    public String categoryPriorVersion() {
        return categoryPriorVersion;
    }

    public String levelModelVersion() {
        return levelModelVersion;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof SensoryModelVersion that)) {
            return false;
        }
        return ingredientProfileVersion.equals(that.ingredientProfileVersion)
            && categoryPriorVersion.equals(that.categoryPriorVersion)
            && levelModelVersion.equals(that.levelModelVersion);
    }

    @Override
    public int hashCode() {
        return Objects.hash(ingredientProfileVersion, categoryPriorVersion, levelModelVersion);
    }

    private static String requireNonBlank(String version, String name) {
        if (version == null || version.isBlank()) {
            throw new IllegalArgumentException(name + " 버전이 필요합니다.");
        }

        return version;
    }
}
