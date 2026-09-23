package com.poudy.excludecode.domain;

import java.util.List;
import java.util.Objects;
import java.util.Set;

public final class ExcludeCodeGroup {

    private final ExcludeCode code;
    private final String displayName;
    private final String description;
    private final List<ExcludeCodeIngredient> ingredients;

    public ExcludeCodeGroup(
        ExcludeCode code,
        String displayName,
        String description,
        List<ExcludeCodeIngredient> ingredients
    ) {
        Objects.requireNonNull(code, "제외 성분군 코드가 필요합니다.");
        List<ExcludeCodeIngredient> members = List.copyOf(ingredients);
        if (members.isEmpty()) {
            throw new InvalidExcludeCodeDefinitionException("제외 성분군에 속한 성분이 없습니다: " + code.value());
        }
        this.code = code;
        this.displayName = displayName;
        this.description = description;
        this.ingredients = members;
    }

    public ExcludeCode code() {
        return code;
    }

    public String codeValue() {
        return code.value();
    }

    public String displayName() {
        return displayName;
    }

    public String description() {
        return description;
    }

    public List<ExcludeCodeIngredient> ingredients() {
        return ingredients;
    }

    public boolean containsIngredient(Long ingredientId) {
        return ingredients.stream().anyMatch(ingredient -> ingredient.id().equals(ingredientId));
    }

    public boolean containsAnyIngredient(Set<Long> ingredientIds) {
        return ingredients.stream().anyMatch(ingredient -> ingredientIds.contains(ingredient.id()));
    }
}
