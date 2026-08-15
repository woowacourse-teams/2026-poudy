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

    @Test
    @DisplayName("문서에 싣는 기본 정렬 이름이 실제 정렬 조건과 같다")
    void defaultNameMatchesSortOption() {
        assertThat(ProductSort.valueOf(ProductSort.DEFAULT_NAME)).isEqualTo(ProductSort.NAME_ASC);
    }
}
