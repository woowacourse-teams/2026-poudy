package com.poudy.product.domain;

import com.poudy.brand.domain.Brand;
import com.poudy.category.domain.Category;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.product.domain.sensory.ProductSensory;
import com.poudy.product.domain.sensory.ProductSensoryEstimator;
import java.time.OffsetDateTime;

public final class ProductFactory {

    private final ProductSensoryEstimator sensoryEstimator;

    public ProductFactory(ProductSensoryEstimator sensoryEstimator) {
        if (sensoryEstimator == null) {
            throw new IllegalArgumentException("제품 감각 추론기가 필요합니다.");
        }
        this.sensoryEstimator = sensoryEstimator;
    }

    public Product create(
        Long id,
        String name,
        Brand brand,
        Category category,
        Ingredients ingredients,
        String imageUrl,
        ProductVariants variants,
        OffsetDateTime updatedAt
    ) {
        ProductSensory sensory = sensoryEstimator.estimate(category, ingredients);
        return new Product(
            id,
            name,
            brand,
            category,
            ingredients,
            imageUrl,
            variants,
            sensory,
            updatedAt
        );
    }
}
