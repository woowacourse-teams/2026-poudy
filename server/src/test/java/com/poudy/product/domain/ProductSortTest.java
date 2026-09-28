package com.poudy.product.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("제품 정렬 계약")
class ProductSortTest {

    @Test
    @DisplayName("기본순, 가격순과 용량별 가격순 다섯 가지만 제공한다")
    void providesUpdatedSorts() {
        assertThat(ProductSort.values()).containsExactly(
            ProductSort.DEFAULT,
            ProductSort.PRICE_DESC,
            ProductSort.PRICE_ASC,
            ProductSort.UNIT_PRICE_DESC,
            ProductSort.UNIT_PRICE_ASC
        );
        assertThat(ProductSort.orDefault(null)).isEqualTo(ProductSort.DEFAULT);
        assertThat(ProductSort.valueOf(ProductSort.DEFAULT_NAME)).isEqualTo(ProductSort.DEFAULT);
    }
}
