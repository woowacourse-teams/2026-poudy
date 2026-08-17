package com.poudy.category.domain;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

public class Categories {

    private final List<Category> values;
    private final Map<Long, Category> byId;

    public Categories(List<Category> values) {
        this.values = List.copyOf(Objects.requireNonNullElse(values, List.of()));
        this.byId = this.values.stream()
                .collect(Collectors.toUnmodifiableMap(Category::id, Function.identity(), (first, second) -> first));

        validateChildrenBelongToParent();
        validateEveryParentHasChild();
    }

    public List<Category> parents() {
        return values.stream().filter(Category::isParent).toList();
    }

    public List<Category> childrenOf(Category parent) {
        if (!parent.isParent()) {
            throw new IllegalArgumentException("대분류의 소분류만 조회할 수 있습니다.");
        }

        return values.stream().filter(category -> category.isChildOf(parent)).toList();
    }

    public Optional<Category> findById(Long id) {
        return Optional.ofNullable(byId.get(id));
    }

    public List<Category> pathOf(Category category) {
        Category found = byId.get(category.id());
        if (found == null) {
            throw new IllegalArgumentException("존재하는 카테고리의 경로만 조회할 수 있습니다.");
        }
        if (found.isParent()) {
            return List.of(found);
        }

        return List.of(byId.get(found.parentId()), found);
    }

    private void validateChildrenBelongToParent() {
        values.stream().filter(category -> !category.isParent()).forEach(this::validateChildBelongsToParent);
    }

    private void validateChildBelongsToParent(Category child) {
        Category parent = byId.get(child.parentId());
        if (parent == null || !parent.isParent()) {
            throw new IllegalArgumentException("소분류는 존재하는 대분류를 부모로 가져야 합니다.");
        }
    }

    private void validateEveryParentHasChild() {
        boolean hasParentWithoutChild = parents().stream().anyMatch(parent -> childrenOf(parent).isEmpty());
        if (hasParentWithoutChild) {
            throw new IllegalArgumentException("대분류는 하나 이상의 소분류를 가져야 합니다.");
        }
    }
}
