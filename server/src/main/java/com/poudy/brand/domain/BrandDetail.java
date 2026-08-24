package com.poudy.brand.domain;

import com.poudy.category.domain.Categories;
import com.poudy.product.domain.ProductCountsByCategory;

public class BrandDetail {

    private final Brand brand;
    private final Categories categories;
    private final ProductCountsByCategory productCountsByCategory;

    public BrandDetail(
            Brand brand,
            Categories categories,
            ProductCountsByCategory productCountsByCategory) {
        this.brand = brand;
        this.categories = categories;
        this.productCountsByCategory = productCountsByCategory;
    }

    public Brand brand() {
        return brand;
    }

    public Categories categories() {
        return categories;
    }

    public ProductCountsByCategory productCountsByCategory() {
        return productCountsByCategory;
    }
}
