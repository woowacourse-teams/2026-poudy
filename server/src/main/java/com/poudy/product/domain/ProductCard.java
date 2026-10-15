package com.poudy.product.domain;

import com.poudy.brand.domain.Brand;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record ProductCard(
    Long id,
    String name,
    Brand brand,
    String imageUrl,
    Long price,
    BigDecimal volumeValue,
    String volumeUnit,
    Integer moistureLevel,
    Integer oilLevel,
    OffsetDateTime updatedAt) {
}
