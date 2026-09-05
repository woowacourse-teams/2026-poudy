package com.poudy.excludecode.domain;

import java.util.List;
import java.util.Objects;

public final class ExcludeCodeMapping {

    private final ExcludeCode code;
    private final List<Long> ingredientIds;

    public ExcludeCodeMapping(ExcludeCode code, List<Long> ingredientIds) {
        if (code == null) {
            throw new IllegalArgumentException("제외 성분군 매핑은 성분군을 가져야 합니다.");
        }

        this.code = code;
        this.ingredientIds = List.copyOf(Objects.requireNonNullElse(ingredientIds, List.of()));
    }

    public ExcludeCode code() {
        return code;
    }

    public List<Long> ingredientIds() {
        return ingredientIds;
    }
}
