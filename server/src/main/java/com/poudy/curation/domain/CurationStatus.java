package com.poudy.curation.domain;

public enum CurationStatus {

    DRAFT,
    PUBLISHED,
    ARCHIVED;

    public boolean isPublished() {
        return this == PUBLISHED;
    }
}
