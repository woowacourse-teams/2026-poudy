package com.poudy.curation.domain;

import com.poudy.category.domain.Category;
import com.poudy.product.domain.Product;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public final class Curation {

    private final Long id;
    private final String title;
    private final String summary;
    private final String description;
    private final List<String> imageUrls;
    private final List<Category> categories;
    private final List<Product> products;
    private final CurationStatus status;

    public Curation(
        Long id,
        String title,
        String summary,
        String description,
        List<String> imageUrls,
        List<Category> categories,
        List<Product> products,
        CurationStatus status
    ) {
        if (id == null) {
            throw new IllegalArgumentException("큐레이션 ID가 필요합니다.");
        }
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("큐레이션 제목이 필요합니다.");
        }
        if (summary == null || summary.isBlank()) {
            throw new IllegalArgumentException("큐레이션 간단 설명이 필요합니다.");
        }
        if (description == null || description.isBlank()) {
            throw new IllegalArgumentException("큐레이션 상세 설명이 필요합니다.");
        }
        if (imageUrls == null || imageUrls.isEmpty() || imageUrls.stream().anyMatch(Curation::isBlank)) {
            throw new IllegalArgumentException("큐레이션 이미지 URL이 하나 이상 필요합니다.");
        }
        if (categories == null) {
            throw new IllegalArgumentException("큐레이션 카테고리 목록이 필요합니다.");
        }
        if (products == null) {
            throw new IllegalArgumentException("큐레이션 제품 목록이 필요합니다.");
        }
        if (status == null) {
            throw new IllegalArgumentException("큐레이션 상태가 필요합니다.");
        }

        validateUniqueCategoryIds(categories);
        validateUniqueProductIds(products);

        this.id = id;
        this.title = title;
        this.summary = summary;
        this.description = description;
        this.imageUrls = List.copyOf(imageUrls);
        this.categories = List.copyOf(categories);
        this.products = List.copyOf(products);
        this.status = status;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static void validateUniqueCategoryIds(List<Category> categories) {
        Set<Long> ids = new HashSet<>();
        if (categories.stream().map(Category::id).anyMatch(id -> !ids.add(id))) {
            throw new IllegalArgumentException("큐레이션 카테고리는 중복될 수 없습니다.");
        }
    }

    private static void validateUniqueProductIds(List<Product> products) {
        Set<Long> ids = new HashSet<>();
        if (products.stream().map(Product::id).anyMatch(id -> !ids.add(id))) {
            throw new IllegalArgumentException("큐레이션 제품은 중복될 수 없습니다.");
        }
    }

    public Long id() {
        return id;
    }

    public String title() {
        return title;
    }

    public String summary() {
        return summary;
    }

    public String description() {
        return description;
    }

    public List<String> imageUrls() {
        return imageUrls;
    }

    public String representativeImageUrl() {
        return imageUrls.getFirst();
    }

    public List<Category> categories() {
        return categories;
    }

    public List<Product> products(Long categoryId) {
        if (categoryId == null) {
            return products;
        }

        return products.stream()
            .filter(product -> product.belongsToCategory(categoryId))
            .toList();
    }

    public CurationStatus status() {
        return status;
    }

    public boolean isPublished() {
        return status.isPublished();
    }
}
