package com.poudy.brand.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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

    @Test
    @DisplayName("ID에 해당하는 브랜드를 찾는다")
    void findsBrandById() {
        Brand drG = brand(1L, "닥터지");
        Brands brands = new Brands(List.of(drG));

        assertThat(brands.findById(1L)).contains(drG);
    }

    @Test
    @DisplayName("ID에 해당하는 브랜드가 없으면 빈 결과를 반환한다")
    void returnsEmptyForUnknownId() {
        Brands brands = new Brands(List.of(brand(1L, "닥터지")));

        assertThat(brands.findById(999L)).isEmpty();
    }

    @Test
    @DisplayName("같은 ID의 브랜드는 허용하지 않는다")
    void rejectsDuplicateIds() {
        assertThatThrownBy(() -> new Brands(List.of(brand(1L, "닥터지"), brand(1L, "메디큐브"))))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("브랜드 ID는 중복될 수 없습니다: 1");
    }

    private static Brand brand(Long id, String koreanName) {
        return new Brand(id, koreanName, null, null);
    }
}
