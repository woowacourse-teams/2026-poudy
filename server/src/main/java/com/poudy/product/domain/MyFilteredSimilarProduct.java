package com.poudy.product.domain;

public record MyFilteredSimilarProduct(Long productId, boolean containsMyFilterIngredient) {
}
