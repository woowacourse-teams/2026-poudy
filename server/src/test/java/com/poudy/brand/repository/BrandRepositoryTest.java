package com.poudy.brand.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.Brands;
import com.poudy.common.json.JsonDataReader;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("브랜드 저장소")
class BrandRepositoryTest {

    @Test
    @DisplayName("브랜드 JSON을 브랜드 목록으로 조회한다")
    void findsAllBrands() {
        JsonDataReader jsonDataReader = mock(JsonDataReader.class);
        Brand drG = new Brand(1L, "닥터지", null, null);
        Brand medicube = new Brand(2L, "메디큐브", null, null);
        given(jsonDataReader.readList("brands.json", Brand.class)).willReturn(List.of(medicube, drG));

        Brands brands = new BrandRepository(jsonDataReader).findAll();

        assertThat(brands.sortedByName()).containsExactly(drG, medicube);
    }
}
