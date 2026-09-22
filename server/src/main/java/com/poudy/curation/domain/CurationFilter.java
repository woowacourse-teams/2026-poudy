package com.poudy.curation.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.util.Objects;
import java.util.UUID;

@Embeddable
public record CurationFilter(@Column(name = "id") UUID id, @Column(name = "label") String label) {
    public CurationFilter {
        Objects.requireNonNull(id);
        if (label == null || label.isBlank()) {
            throw new IllegalArgumentException("필터 이름이 필요합니다.");
        }
    }
}
