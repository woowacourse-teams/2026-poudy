package com.poudy.product.domain;

import com.poudy.brand.domain.Brand;
import java.util.Objects;

public class BrandProductCount {

    private final Brand brand;
    private final long productCount;

    public BrandProductCount(Brand brand, long productCount) {
        this.brand = Objects.requireNonNull(brand);
        this.productCount = productCount;
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

    public long productCount() {
        return productCount;
    }
}
