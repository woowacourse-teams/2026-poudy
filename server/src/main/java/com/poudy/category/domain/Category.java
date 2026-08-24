package com.poudy.category.domain;

import java.util.Objects;

public class Category {

    private final Long id;
    private final Long parentId;
    private final String name;
    private final Integer depth;

    public Category(Long id, Long parentId, String name, Integer depth) {
        this.id = id;
        this.parentId = parentId;
        this.name = name;
        this.depth = depth;

        validateDepth();
        validateParentId();
    }

    public boolean isParent() {
        return depth == 0;
    }

    public boolean isChildOf(Category parent) {
        Objects.requireNonNull(parent);

        return parent.isParent() && Objects.equals(parentId, parent.id);
    }

    private void validateDepth() {
        if (depth == null || depth < 0 || depth > 1) {
            throw new IllegalArgumentException("카테고리 깊이는 0 또는 1이어야 합니다.");
        }
    }

    private void validateParentId() {
        if (isParent() && parentId != null) {
            throw new IllegalArgumentException("대분류는 부모 카테고리를 가질 수 없습니다.");
        }
        if (!isParent() && parentId == null) {
            throw new IllegalArgumentException("소분류는 부모 카테고리를 가져야 합니다.");
        }
    }

    public Long id() {
        return id;
    }

    public Long parentId() {
        return parentId;
    }

    public String name() {
        return name;
    }
}
