package com.poudy.product.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ProductSortTest {

    @Test
    void providesEveryProductSortOption() {
        assertThat(ProductSort.values()).containsExactly(
                ProductSort.NAME_ASC,
                ProductSort.NAME_DESC,
                ProductSort.PRICE_ASC,
                ProductSort.PRICE_DESC);
    }
}
