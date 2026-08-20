package com.poudy.brand.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("브랜드별 제품 수")
class BrandCountsTest {

    @Test
    @DisplayName("브랜드를 이름순으로 제품 수와 함께 반환한다")
    void returnsBrandsWithProductCounts() {
        Brand cellFusionC = brand(3L, "셀퓨전씨");
        Brand drG = brand(1L, "닥터지");
        Brand medicube = brand(2L, "메디큐브");
        Brands brands = new Brands(List.of(cellFusionC, drG, medicube));
        BrandCounts counts = new BrandCounts(brands, Map.of(1L, 3L, 3L, 2L));

        assertThat(counts.brands()).containsExactly(drG, medicube, cellFusionC);
        assertThat(counts.productCountOf(drG)).isEqualTo(3L);
        assertThat(counts.productCountOf(cellFusionC)).isEqualTo(2L);
    }

    @Test
    @DisplayName("제품이 없는 브랜드의 제품 수는 0이다")
    void fillsZeroForBrandWithoutProducts() {
        Brand brand = brand(1L, "브랜드");
        BrandCounts counts = new BrandCounts(new Brands(List.of(brand)), null);

        assertThat(counts.productCountOf(brand)).isZero();
    }

    @Test
    @DisplayName("제품 수는 존재하는 브랜드에 대해서만 받을 수 있다")
    void rejectsProductCountsForInvalidBrand() {
        Brands brands = new Brands(List.of(brand(1L, "브랜드")));

        assertThatThrownBy(() -> new BrandCounts(brands, Map.of(999L, 1L)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("제품은 존재하는 브랜드에 속해야 합니다.");
    }

    private static Brand brand(Long id, String koreanName) {
        return new Brand(id, koreanName, null, null);
    }
}
