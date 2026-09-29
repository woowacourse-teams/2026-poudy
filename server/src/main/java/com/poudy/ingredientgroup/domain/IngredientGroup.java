package com.poudy.ingredientgroup.domain;

import java.util.List;
import java.util.Objects;

public final class IngredientGroup {

    private final String code;
    private final String name;
    private final List<Long> ingredientIds;

    public IngredientGroup(String code, String name, List<Long> ingredientIds) {
        this.code = Objects.requireNonNull(code, "성분군 코드가 필요합니다.");
        this.name = name;
        this.ingredientIds = List.copyOf(ingredientIds);
    }

    public String code() {
        return code;
    }

    public String name() {
        return name;
    }

    public boolean contains(Long ingredientId) {
        return ingredientIds.contains(ingredientId);
    }

    public long countIn(List<Long> candidates) {
        return candidates.stream().distinct().filter(this::contains).count();
    }
}
