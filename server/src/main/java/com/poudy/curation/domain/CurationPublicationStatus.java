package com.poudy.curation.domain;

public enum CurationPublicationStatus {
    PUBLISHED,
    UNPUBLISHED;

    boolean isPublished() {
        return this == PUBLISHED;
    }
}
