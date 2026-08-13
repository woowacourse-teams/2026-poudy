package com.poudy.product.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("제품 정렬 기준")
class ProductSortTest {

    @Test
    @DisplayName("이름과 가격의 오름차순·내림차순을 제공한다")
    void providesEveryProductSortOption() {
        assertThat(ProductSort.values()).containsExactly(
                ProductSort.NAME_ASC,
                ProductSort.NAME_DESC,
                ProductSort.PRICE_ASC,
                ProductSort.PRICE_DESC);
    }
}
