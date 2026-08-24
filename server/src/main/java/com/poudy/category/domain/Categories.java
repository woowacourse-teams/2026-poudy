package com.poudy.category.domain;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Stream;

public class Categories {

    private final Map<Long, Category> categories;

    private Categories(Map<Long, Category> categories) {
        this.categories = categories;
    }

    public static Categories from(List<Category> categories) {
        List<Category> copiedCategories = List.copyOf(Objects.requireNonNullElse(categories, List.of()));
        Map<Long, Category> indexedCategories = indexById(copiedCategories);

        validateChildrenBelongToParent(indexedCategories);
        validateEveryParentHasChild(indexedCategories);

        return new Categories(indexedCategories);
    }

    public List<Category> parents() {
        return categories.values()
                .stream()
                .filter(Category::isParent)
                .toList();
    }

    public List<Category> childrenOf(Category parent) {
        return categories.values().stream()
                .filter(category -> category.isChildOf(parent))
                .toList();
    }

    public Optional<Category> findById(Long id) {
        return Optional.ofNullable(categories.get(id));
    }

    public List<Category> pathOf(Category category) {
        Category found = categories.get(category.id());
        if (found == null) {
            throw new IllegalArgumentException("존재하는 카테고리의 경로만 조회할 수 있습니다.");
        }

        return pathFromRoot(found);
    }

    private List<Category> pathFromRoot(Category category) {
        if (category.isParent()) {
            return List.of(category);
        }

        Category parent = categories.get(category.parentId());

        return Stream.concat(pathFromRoot(parent).stream(), Stream.of(category)).toList();
    }

    private static void validateChildrenBelongToParent(Map<Long, Category> categories) {
        categories.values().stream()
                .filter(category -> !category.isParent())
                .forEach(category -> validateChildBelongsToParent(category, categories));
    }

    private static void validateChildBelongsToParent(
            Category child,
            Map<Long, Category> categories) {
        Category parent = categories.get(child.parentId());
        if (parent == null || !child.isChildOf(parent)) {
            throw new IllegalArgumentException("소분류는 존재하는 대분류를 부모로 가져야 합니다.");
        }
    }

    private static void validateEveryParentHasChild(Map<Long, Category> categories) {
        boolean hasParentWithoutChild = categories.values().stream()
                .filter(Category::isParent)
                .anyMatch(
                        parent -> categories.values().stream()
                                .noneMatch(category -> category.isChildOf(parent)));

        if (hasParentWithoutChild) {
            throw new IllegalArgumentException("대분류는 하나 이상의 소분류를 가져야 합니다.");
        }
    }

    private static Map<Long, Category> indexById(List<Category> categories) {
        Map<Long, Category> indexed = new LinkedHashMap<>();
        for (Category category : categories) {
            if (indexed.putIfAbsent(category.id(), category) != null) {
                throw new IllegalArgumentException("카테고리 ID는 중복될 수 없습니다.");
            }
        }

        return Collections.unmodifiableMap(indexed);
    }
}
