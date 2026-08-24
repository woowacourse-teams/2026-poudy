package com.poudy.brand.domain;

import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import com.poudy.product.domain.ProductCountsByCategory;
import java.util.List;

public class BrandDetail {

    private final Long id;
    private final String koreanName;
    private final String englishName;
    private final String imageUrl;
    private final Categories categories;
    private final ProductCountsByCategory productCountsByCategory;

    public BrandDetail(
            Brand brand,
            Categories categories,
            ProductCountsByCategory productCountsByCategory) {
        this.id = brand.id();
        this.koreanName = brand.koreanName();
        this.englishName = brand.englishName();
        this.imageUrl = brand.imageUrl();
        this.categories = categories;
        this.productCountsByCategory = productCountsByCategory;
    }

    public Long id() {
        return id;
    }

    public String koreanName() {
        return koreanName;
    }

    public String englishName() {
        return englishName;
    }

    public String imageUrl() {
        return imageUrl;
    }

    public List<Category> categories() {
        return categories.parents().stream()
                .filter(category -> productCountsByCategory.countOf(category) > 0)
                .toList();
    }

    public List<Category> childrenOf(Category category) {
        return categories.childrenOf(category).stream()
                .filter(child -> productCountsByCategory.countOf(child) > 0)
                .toList();
    }

    public long productCountOf(Category category) {
        return productCountsByCategory.countOf(category);
    }
}
