package com.poudy.brand.controller.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.brand.domain.Brand;
import com.poudy.category.controller.dto.CategoryChildResponse;
import com.poudy.category.controller.dto.CategoryResponse;
import com.poudy.category.domain.Category;
import com.poudy.product.domain.BrandProductCounts;
import com.poudy.product.domain.CategoryProductCount;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("브랜드 상세 응답")
class BrandDetailResponseTest {

    @Test
    @DisplayName("브랜드와 관련 카테고리 계층을 응답으로 변환한다")
    void convertsBrandDetail() {
        Brand brand = new Brand(1L, "닥터지", null, null);
        CategoryProductCount toner = new CategoryProductCount(new Category(2L, 1L, "토너", 1), 2L, List.of());
        CategoryProductCount skinCare = new CategoryProductCount(
                new Category(1L, null, "스킨케어", 0),
                2L,
                List.of(toner));
        BrandProductCounts brandProductCounts = new BrandProductCounts(brand, List.of(skinCare));

        BrandDetailResponse response = BrandDetailResponse.from(brandProductCounts);

        assertThat(response).isEqualTo(
                new BrandDetailResponse(
                        1L,
                        "닥터지",
                        null,
                        null,
                        List.of(
                                new CategoryResponse(
                                        1L,
                                        "스킨케어",
                                        List.of(new CategoryChildResponse(2L, "토너", 2L)),
                                        2L))));
    }
}
