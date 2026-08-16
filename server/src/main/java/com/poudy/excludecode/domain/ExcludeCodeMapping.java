package com.poudy.excludecode.domain;

import java.util.List;
import java.util.Objects;

public record ExcludeCodeMapping(ExcludeCode code, List<Long> ingredientIds) {

    public ExcludeCodeMapping {
        if (code == null) {
            throw new IllegalArgumentException("제외 성분군 매핑은 성분군을 가져야 합니다.");
        }

        ingredientIds = List.copyOf(Objects.requireNonNullElse(ingredientIds, List.of()));
    }
}
