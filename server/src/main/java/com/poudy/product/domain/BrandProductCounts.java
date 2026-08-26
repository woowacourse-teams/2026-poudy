package com.poudy.product.domain;

import com.poudy.brand.domain.Brand;
import java.util.List;
import java.util.Objects;

public class BrandProductCounts {

    private final Brand brand;
    private final List<CategoryProductCount> categories;

    public BrandProductCounts(Brand brand, List<CategoryProductCount> categories) {
        this.brand = Objects.requireNonNull(brand);
        this.categories = List.copyOf(Objects.requireNonNullElse(categories, List.of()));
    }

    public Long id() {
        return brand.id();
    }

    public String koreanName() {
        return brand.koreanName();
    }

    public String englishName() {
        return brand.englishName();
    }

    public String imageUrl() {
        return brand.imageUrl();
    }

    public List<CategoryProductCount> categories() {
        return categories;
    }
}
