package com.poudy.product.domain;

import com.poudy.brand.domain.Brand;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record ProductCard(
    Long id,
    String name,
    Brand brand,
    List<Mark> marks,
    String imageUrl,
    Long price,
    BigDecimal volumeValue,
    String volumeUnit,
    Double moistureLevel,
    Double oilLevel,
    boolean sensitiveSkin,
    OffsetDateTime updatedAt) {
    public ProductCard {
        marks = List.copyOf(marks);
    }
}
