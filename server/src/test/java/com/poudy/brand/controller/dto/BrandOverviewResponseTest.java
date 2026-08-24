package com.poudy.brand.controller.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.BrandCounts;
import com.poudy.brand.domain.Brands;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("브랜드 개요 응답")
class BrandOverviewResponseTest {

    @Test
    @DisplayName("브랜드를 이름순으로 제품 수와 함께 응답으로 변환한다")
    void convertsBrandCounts() {
        Brand drG = new Brand(1L, "닥터지", null, null);
        Brand medicube = new Brand(2L, "메디큐브", "MEDICUBE", "https://cdn.example.com/brands/2/image.png");
        BrandCounts brandCounts = new BrandCounts(new Brands(List.of(medicube, drG)), Map.of(1L, 3L));

        BrandOverviewResponse response = BrandOverviewResponse.from(brandCounts);

        assertThat(response.items()).containsExactly(
                new BrandSummaryResponse(1L, "닥터지", "", "", 3L),
                new BrandSummaryResponse(
                        2L,
                        "메디큐브",
                        "MEDICUBE",
                        "https://cdn.example.com/brands/2/image.png",
                        0L));
    }
}
