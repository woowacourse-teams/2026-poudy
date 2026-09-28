package com.poudy.excludecode.domain;

import java.util.List;
import java.util.Set;

public final class ExcludeCodes {

    private final List<ExcludeCodeGroup> groups;

    public ExcludeCodes(List<ExcludeCodeGroup> groups) {
        if (groups.isEmpty()) {
            throw new InvalidExcludeCodeDefinitionException("제외 성분군 정의를 찾지 못했습니다.");
        }
        this.groups = List.copyOf(groups);
    }

    public List<ExcludeCodeGroup> groups() {
        return groups;
    }

    public List<ExcludeCode> codesOf(Long ingredientId) {
        return groups.stream()
            .filter(group -> group.containsIngredient(ingredientId))
            .map(ExcludeCodeGroup::code)
            .toList();
    }

    public List<ExcludeCodeGroup> freeCodesOf(List<Long> productIngredientIds) {
        Set<Long> present = Set.copyOf(productIngredientIds);
        return groups.stream()
            .filter(group -> !group.containsAnyIngredient(present))
            .toList();
    }
}
