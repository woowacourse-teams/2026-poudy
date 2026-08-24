package com.poudy.category.controller.dto;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import com.poudy.product.domain.ProductCountsByCategory;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("카테고리 목록 응답")
class CategoryListResponseTest {

    @Test
    @DisplayName("대분류와 소분류를 제품 수와 함께 계층 응답으로 변환한다")
    void convertsCategoriesAndProductCounts() {
        Category skinCare = new Category(1L, null, "스킨케어", 0);
        Category toner = new Category(2L, 1L, "토너", 1);
        Category serum = new Category(3L, 1L, "세럼", 1);
        Category cleansing = new Category(4L, null, "클렌징", 0);
        Category cleansingFoam = new Category(5L, 4L, "클렌징폼", 1);
        Categories categories = Categories.from(List.of(skinCare, toner, serum, cleansing, cleansingFoam));
        ProductCountsByCategory productCounts = mock(ProductCountsByCategory.class);
        given(productCounts.countOf(skinCare)).willReturn(3L);
        given(productCounts.countOf(toner)).willReturn(2L);
        given(productCounts.countOf(serum)).willReturn(1L);
        given(productCounts.countOf(cleansing)).willReturn(4L);
        given(productCounts.countOf(cleansingFoam)).willReturn(4L);

        CategoryListResponse response = CategoryListResponse.from(categories, productCounts);

        assertThat(response.items()).containsExactly(
                new CategoryResponse(
                        1L,
                        "스킨케어",
                        List.of(new CategoryChildResponse(2L, "토너", 2L), new CategoryChildResponse(3L, "세럼", 1L)),
                        3L),
                new CategoryResponse(4L, "클렌징", List.of(new CategoryChildResponse(5L, "클렌징폼", 4L)), 4L));
    }
}
