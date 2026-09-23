package com.poudy.tag.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.Objects;

@Entity
@Table(name = "tag")
public class Tag {

    @Id
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(name = "category_code")
    private TagCategory category;

    @Column(name = "name")
    private String name;

    protected Tag() {
    }

    public Tag(String code, TagCategory category, String name) {
        validateCategory(category);
        validateCode(code);
        validateName(name);

        this.category = category;
        this.code = code;
        this.name = name;
    }

    public boolean isOf(TagCategory other) {
        return category == other;
    }

    private static void validateCategory(TagCategory category) {
        Objects.requireNonNull(category, "태그 구분이 필요합니다.");
    }

    private static void validateCode(String code) {
        Objects.requireNonNull(code, "태그 코드가 필요합니다.");
        if (code.isBlank()) {
            throw new IllegalArgumentException("태그 코드가 필요합니다.");
        }
    }

    private static void validateName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("태그 이름이 필요합니다.");
        }
    }

    public String id() {
        return code;
    }

    public String code() {
        return code;
    }

    public String name() {
        return name;
    }
}
