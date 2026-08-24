package com.poudy.brand.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("브랜드별 제품 수")
class BrandCountsTest {

    @Test
    @DisplayName("브랜드 ID에 해당하는 제품 수를 반환한다")
    void returnsCountByBrandId() {
        BrandCounts brandCounts = new BrandCounts(Map.of(1L, 3L));

        assertThat(brandCounts.countOf(1L)).isEqualTo(3L);
    }

    @Test
    @DisplayName("집계되지 않은 브랜드의 제품 수는 0이다")
    void returnsZeroForUnknownBrandId() {
        BrandCounts brandCounts = new BrandCounts(Map.of());

        assertThat(brandCounts.countOf(999L)).isZero();
    }

    @Test
    @DisplayName("집계 결과가 없으면 모든 브랜드의 제품 수는 0이다")
    void returnsZeroForMissingCounts() {
        BrandCounts brandCounts = new BrandCounts(null);

        assertThat(brandCounts.countOf(1L)).isZero();
    }
}
