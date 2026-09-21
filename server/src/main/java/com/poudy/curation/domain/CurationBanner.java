package com.poudy.curation.domain;

public final class CurationBanner {
    private final boolean visible;
    private final String thumbnailImageUrl;

    public CurationBanner(boolean visible, String thumbnailImageUrl) {
        if (visible && thumbnailImageUrl == null) {
            throw new IllegalArgumentException("노출할 배너의 썸네일 URL이 필요합니다.");
        }
        if (thumbnailImageUrl != null && thumbnailImageUrl.isBlank()) {
            throw new IllegalArgumentException("배너 썸네일 URL은 비어 있을 수 없습니다.");
        }
        this.visible = visible;
        this.thumbnailImageUrl = thumbnailImageUrl;
    }

    boolean isVisible() {
        return visible;
    }

    String thumbnailImageUrl() {
        return thumbnailImageUrl;
    }
}
