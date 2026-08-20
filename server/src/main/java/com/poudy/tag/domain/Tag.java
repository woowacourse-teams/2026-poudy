package com.poudy.tag.domain;

import java.util.Objects;

public record Tag(Long id, TagCategory category, String code, String name) {

    public Tag {
        Objects.requireNonNull(id, "태그 ID가 필요합니다.");
        Objects.requireNonNull(category, "태그 구분이 필요합니다.");
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("태그 코드가 필요합니다.");
        }
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("태그 이름이 필요합니다.");
        }
    }

    public boolean isOf(TagCategory other) {
        return category == other;
    }
}
