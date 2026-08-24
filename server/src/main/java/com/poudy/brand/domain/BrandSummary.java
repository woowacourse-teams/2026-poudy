package com.poudy.brand.domain;

public class BrandSummary {

    private final Long id;
    private final String koreanName;
    private final String englishName;
    private final String imageUrl;
    private final long productCount;

    BrandSummary(Brand brand, long productCount) {
        this.id = brand.id();
        this.koreanName = brand.koreanName();
        this.englishName = brand.englishName();
        this.imageUrl = brand.imageUrl();
        this.productCount = productCount;
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

    public long productCount() {
        return productCount;
    }
}
