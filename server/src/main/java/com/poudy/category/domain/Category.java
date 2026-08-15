package com.poudy.category.domain;

import java.time.OffsetDateTime;
import java.util.Objects;

public record Category(
        Long id,
        Long parentId,
        String name,
        Integer depth,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {

    public Category {
        if (depth == null || depth < 0 || depth > 1) {
            throw new IllegalArgumentException("카테고리 깊이는 0 또는 1이어야 합니다.");
        }
        if (depth == 0 && parentId != null) {
            throw new IllegalArgumentException("대분류는 부모 카테고리를 가질 수 없습니다.");
        }
        if (depth == 1 && parentId == null) {
            throw new IllegalArgumentException("소분류는 부모 카테고리를 가져야 합니다.");
        }
    }

    public boolean isParent() {
        return depth == 0;
    }

    public boolean isChildOf(Category parent) {
        Objects.requireNonNull(parent);
        return Objects.equals(parentId, parent.id());
    }
}
