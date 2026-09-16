package com.poudy.curation.domain;

public record CurationBanner(String title, String description, String thumbnailImageUrl) {
    public CurationBanner {
        title = requireNonBlank(title, "배너 제목");
        description = requireNonBlank(description, "배너 설명");
        thumbnailImageUrl = requireNonBlank(thumbnailImageUrl, "배너 썸네일 URL");
    }

    private static String requireNonBlank(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + "이 필요합니다.");
        }
        return value;
    }
}
