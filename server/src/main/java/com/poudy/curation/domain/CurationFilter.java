package com.poudy.curation.domain;

import java.util.Objects;
import java.util.UUID;

public record CurationFilter(UUID id, String label) {
    public CurationFilter {
        Objects.requireNonNull(id);
        if (label == null || label.isBlank()) {
            throw new IllegalArgumentException("필터 이름이 필요합니다.");
        }
    }
}
