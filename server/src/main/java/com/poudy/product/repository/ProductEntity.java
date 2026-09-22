package com.poudy.product.repository;

import com.poudy.brand.domain.Brand;
import com.poudy.category.domain.Category;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.ProductVariants;
import com.poudy.product.domain.sensory.MoistureLevel;
import com.poudy.product.domain.sensory.OilLevel;
import com.poudy.product.domain.sensory.ProductSensory;
import com.poudy.skintype.domain.SkinType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Set;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "product")
public class ProductEntity {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

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

    @Column(name = "moisture_level")
    private Short moistureLevel;

    @Column(name = "oil_level")
    private Short oilLevel;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

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
        Brand brand,
        Category category,
        Ingredients ingredients,
        ProductVariants variants,
        Set<SkinType> skinTypes
    ) {
        return new Product(
            id,
            productName,
            brand,
            category,
            ingredients,
            imageUrl,
            variants,
            new ProductSensory(new MoistureLevel(moistureLevel), new OilLevel(oilLevel)),
            updatedAt.atZone(SEOUL).toOffsetDateTime(),
            skinTypes
        );
    }
}
