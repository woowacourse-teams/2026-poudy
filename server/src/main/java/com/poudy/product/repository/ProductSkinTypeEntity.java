package com.poudy.product.repository;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "product_skin_type")
public class ProductSkinTypeEntity {

    @EmbeddedId
    private ProductSkinTypeId id;

    protected ProductSkinTypeEntity() {
    }

    public ProductSkinTypeId id() {
        return id;
    }
}
