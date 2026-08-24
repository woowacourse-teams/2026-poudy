package com.poudy.brand.controller.dto;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.BrandDetail;
import com.poudy.category.controller.dto.CategoryChildResponse;
import com.poudy.category.controller.dto.CategoryResponse;
import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import com.poudy.product.domain.ProductCountsByCategory;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("브랜드 상세 응답")
class BrandDetailResponseTest {

    @Test
    @DisplayName("브랜드와 관련 카테고리 계층을 응답으로 변환한다")
    void convertsBrandDetail() {
        Brand brand = new Brand(1L, "닥터지", null, null);
        Category skinCare = new Category(1L, null, "스킨케어", 0, null, null);
        Category toner = new Category(2L, 1L, "토너", 1, null, null);
        Category serum = new Category(3L, 1L, "세럼", 1, null, null);
        Categories categories = new Categories(List.of(skinCare, toner, serum));
        ProductCountsByCategory productCounts = mock(ProductCountsByCategory.class);
        given(productCounts.countOf(skinCare)).willReturn(2L);
        given(productCounts.countOf(toner)).willReturn(2L);
        BrandDetail brandDetail = new BrandDetail(brand, categories, productCounts);

        BrandDetailResponse response = BrandDetailResponse.from(brandDetail);

        assertThat(response).isEqualTo(
                new BrandDetailResponse(
                        1L,
                        "닥터지",
                        "",
                        "",
                        List.of(
                                new CategoryResponse(
                                        1L,
                                        "스킨케어",
                                        List.of(new CategoryChildResponse(2L, "토너", 2L)),
                                        2L))));
    }
}
