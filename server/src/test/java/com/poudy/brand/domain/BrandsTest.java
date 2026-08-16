package com.poudy.brand.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("브랜드 목록")
class BrandsTest {

    @Test
    @DisplayName("브랜드를 한글명 오름차순으로 반환한다")
    void sortsBrandsByKoreanName() {
        Brand cellFusionC = brand(3L, "셀퓨전씨");
        Brand drG = brand(1L, "닥터지");
        Brand medicube = brand(2L, "메디큐브");
        Brands brands = new Brands(List.of(cellFusionC, drG, medicube));

        assertThat(brands.sortedByName()).containsExactly(drG, medicube, cellFusionC);
    }

    @Test
    @DisplayName("한글명이 같으면 ID 오름차순으로 반환한다")
    void sortsBrandsWithSameKoreanNameById() {
        Brand second = brand(2L, "브랜드");
        Brand first = brand(1L, "브랜드");
        Brands brands = new Brands(List.of(second, first));

        assertThat(brands.sortedByName()).containsExactly(first, second);
    }

    @Test
    @DisplayName("브랜드 목록이 없으면 빈 목록을 반환한다")
    void returnsEmptyListForMissingBrands() {
        assertThat(new Brands(null).sortedByName()).isEmpty();
    }

    private static Brand brand(Long id, String koreanName) {
        return new Brand(id, koreanName, null, null);
    }
}
