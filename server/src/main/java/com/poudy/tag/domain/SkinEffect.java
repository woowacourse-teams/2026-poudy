package com.poudy.tag.domain;

import java.util.Objects;

public class SkinEffect {

    private final Long id;
    private final String code;
    private final String displayName;

    public SkinEffect(Long id, String code, String displayName) {
        validateId(id);
        validateCode(code);
        validateDisplayName(displayName);

        this.id = id;
        this.code = code;
        this.displayName = displayName;
    }

    private static void validateId(Long id) {
        Objects.requireNonNull(id, "피부 작용 ID가 필요합니다.");
    }

    private static void validateCode(String code) {
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("피부 작용 코드가 필요합니다.");
        }
    }

    private static void validateDisplayName(String displayName) {
        if (displayName == null || displayName.isBlank()) {
            throw new IllegalArgumentException("피부 작용 표시 이름이 필요합니다.");
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
