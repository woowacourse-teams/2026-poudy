package com.poudy.ingredient.domain;

import com.poudy.brand.domain.Brand;
import java.math.BigDecimal;

/** 성분 상세에서 보여 줄 포함 제품 미리보기다. */
public record IngredientProduct(
    Long id,
    String name,
    Brand brand,
    String imageUrl,
    Long price,
    BigDecimal volumeValue,
    String volumeUnit,
    Double moistureLevel,
    Double oilLevel) {
}
