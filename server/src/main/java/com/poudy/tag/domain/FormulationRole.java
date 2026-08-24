package com.poudy.tag.domain;

import java.util.Objects;

public class FormulationRole {

    private final Long id;
    private final String code;
    private final String displayName;

    public FormulationRole(Long id, String code, String displayName) {
        validateId(id);
        validateCode(code);
        validateDisplayName(displayName);

        this.id = id;
        this.code = code;
        this.displayName = displayName;
    }

    public boolean hasCode(String candidate) {
        return code.equals(candidate);
    }

    private static void validateId(Long id) {
        Objects.requireNonNull(id, "배합 목적 ID가 필요합니다.");
    }

    private static void validateCode(String code) {
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("배합 목적 코드가 필요합니다.");
        }
    }

    private static void validateDisplayName(String displayName) {
        if (displayName == null || displayName.isBlank()) {
            throw new IllegalArgumentException("배합 목적 표시 이름이 필요합니다.");
        }
    }

    public Long id() {
        return id;
    }

    public String code() {
        return code;
    }

    public String displayName() {
        return displayName;
    }
}
