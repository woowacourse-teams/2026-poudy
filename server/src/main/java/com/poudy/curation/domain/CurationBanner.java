package com.poudy.curation.domain;

import java.util.Objects;

public final class CurationBanner {
    private final CurationPublicationStatus publicationStatus;
    private final String thumbnailImageUrl;

    public CurationBanner(CurationPublicationStatus publicationStatus, String thumbnailImageUrl) {
        CurationPublicationStatus validatedPublicationStatus = Objects.requireNonNull(publicationStatus);
        if (thumbnailImageUrl == null || thumbnailImageUrl.isBlank()) {
            throw new IllegalArgumentException("배너 썸네일 URL이 필요합니다.");
        }
        this.publicationStatus = validatedPublicationStatus;
        this.thumbnailImageUrl = thumbnailImageUrl;
    }

    boolean isPublished() {
        return publicationStatus.isPublished();
    }

    String thumbnailImageUrl() {
        return thumbnailImageUrl;
    }
}
