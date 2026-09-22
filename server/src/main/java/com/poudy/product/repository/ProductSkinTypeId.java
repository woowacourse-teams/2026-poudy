package com.poudy.product.repository;

import com.poudy.skintype.domain.SkinType;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import java.io.Serializable;

@Embeddable
public record ProductSkinTypeId(
    @Column(name = "product_id") Long productId,
    @Enumerated(EnumType.STRING) @Column(name = "skin_type_code") SkinType skinType) implements Serializable {
}
