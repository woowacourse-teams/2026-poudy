package com.poudy.product.repository;

import com.poudy.brand.domain.Brand;
import com.poudy.category.domain.Category;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.ProductFactory;
import com.poudy.product.domain.ProductVariants;
import com.poudy.skintype.domain.SkinType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.Set;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "product")
public class ProductEntity {

    @Id
    private Long id;

    @Column(name = "brand_id")
    private Long brandId;

    @Column(name = "category_id")
    private Long categoryId;

    @Column(name = "product_name")
    private String productName;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    protected ProductEntity() {
    }

    public Long id() {
        return id;
    }

    public Long brandId() {
        return brandId;
    }

    public Long categoryId() {
        return categoryId;
    }

    public Product toDomain(
        ProductFactory productFactory,
        Brand brand,
        Category category,
        Ingredients ingredients,
        ProductVariants variants,
        Set<SkinType> skinTypes
    ) {
        return productFactory.create(
            id,
            productName,
            brand,
            category,
            ingredients,
            imageUrl,
            variants,
            updatedAt,
            skinTypes
        );
    }
}
