package com.poudy.brand.domain;

import com.poudy.category.domain.CountedCategory;
import java.util.List;
import java.util.Objects;

public class BrandDetail {

    private final Long id;
    private final String koreanName;
    private final String englishName;
    private final String imageUrl;
    private final List<CountedCategory> categories;

    public BrandDetail(Brand brand, List<CountedCategory> categories) {
        this.id = brand.id();
        this.koreanName = brand.koreanName();
        this.englishName = brand.englishName();
        this.imageUrl = brand.imageUrl();
        this.categories = List.copyOf(Objects.requireNonNullElse(categories, List.of()));
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

    public List<CountedCategory> categories() {
        return categories;
    }
}
