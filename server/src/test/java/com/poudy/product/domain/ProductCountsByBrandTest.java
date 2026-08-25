package com.poudy.product.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.BrandSummary;
import com.poudy.brand.domain.Brands;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("브랜드별 제품 수")
class ProductCountsByBrandTest {

    @Test
    @DisplayName("브랜드 ID에 해당하는 제품 수를 반환한다")
    void returnsCountByBrandId() {
        ProductCountsByBrand productCounts = new ProductCountsByBrand(Map.of(1L, 3L));

        assertThat(productCounts.countOf(1L)).isEqualTo(3L);
    }

    @Test
    @DisplayName("집계되지 않은 브랜드의 제품 수는 0이다")
    void returnsZeroForUnknownBrandId() {
        ProductCountsByBrand productCounts = new ProductCountsByBrand(Map.of());

        assertThat(productCounts.countOf(999L)).isZero();
    }

    @Test
    @DisplayName("집계 결과가 없으면 모든 브랜드의 제품 수는 0이다")
    void returnsZeroForMissingCounts() {
        ProductCountsByBrand productCounts = new ProductCountsByBrand(null);

        assertThat(productCounts.countOf(1L)).isZero();
    }

    @Test
    @DisplayName("브랜드를 이름순으로 제품 수와 결합한다")
    void summarizesBrandsWithProductCounts() {
        Brand drG = new Brand(1L, "닥터지", null, null);
        Brand medicube = new Brand(2L, "메디큐브", null, null);
        Brands brands = new Brands(List.of(medicube, drG));
        ProductCountsByBrand productCounts = new ProductCountsByBrand(Map.of(1L, 3L));

        assertThat(productCounts.summariesOf(brands.sortedByName()))
                .extracting(BrandSummary::id, BrandSummary::productCount)
                .containsExactly(tuple(1L, 3L), tuple(2L, 0L));
    }
}
