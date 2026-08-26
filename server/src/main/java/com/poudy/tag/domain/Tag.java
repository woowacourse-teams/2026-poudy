package com.poudy.tag.domain;

import java.util.Objects;

public class Tag {

    private final Long id;
    private final TagCategory category;
    private final String code;
    private final String name;

    public Tag(Long id, TagCategory category, String code, String name) {
        validateId(id);
        validateCategory(category);
        validateCode(code);
        validateName(name);

        this.id = id;
        this.category = category;
        this.code = code;
        this.name = name;
    }

    public boolean isOf(TagCategory other) {
        return category == other;
    }

    private static void validateId(Long id) {
        Objects.requireNonNull(id, "태그 ID가 필요합니다.");
    }

    private static void validateCategory(TagCategory category) {
        Objects.requireNonNull(category, "태그 구분이 필요합니다.");
    }

    private static void validateCode(String code) {
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("태그 코드가 필요합니다.");
        }
    }

    private static void validateName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("태그 이름이 필요합니다.");
        }
    }

    public Long id() {
        return id;
    }

    public String code() {
        return code;
    }

    public String name() {
        return name;
    }
}
