package com.poudy.product.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.Brands;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("브랜드별 제품 수")
class ProductCountsByBrandTest {

    @Test
    @DisplayName("브랜드를 받은 순서대로 제품 수와 결합한다")
    void summarizesBrandsWithProductCounts() {
        Brands brands = Brands.from(List.of(brand(2L, "메디큐브"), brand(1L, "닥터지")));
        ProductCountsByBrand productCounts = new ProductCountsByBrand(Map.of(1L, 3L));

        assertThat(productCounts.countsOf(brands.sortedByName()))
            .extracting(BrandProductCount::id, BrandProductCount::productCount)
            .containsExactly(tuple(1L, 3L), tuple(2L, 0L));
    }

    @Test
    @DisplayName("집계되지 않은 브랜드의 제품 수는 0이다")
    void summarizesUncountedBrandWithZero() {
        ProductCountsByBrand productCounts = new ProductCountsByBrand(Map.of(1L, 3L));

        assertThat(productCounts.countsOf(List.of(brand(999L, "없는 브랜드"))))
            .extracting(BrandProductCount::productCount)
            .containsExactly(0L);
    }

    @Test
    @DisplayName("집계 결과가 없으면 모든 브랜드의 제품 수는 0이다")
    void summarizesEveryBrandWithZeroForMissingCounts() {
        ProductCountsByBrand productCounts = new ProductCountsByBrand(null);

        assertThat(productCounts.countsOf(List.of(brand(1L, "닥터지"), brand(2L, "메디큐브"))))
            .extracting(BrandProductCount::productCount)
            .containsExactly(0L, 0L);
    }

    private static Brand brand(Long id, String koreanName) {
        return new Brand(id, koreanName, null, null);
    }
}
