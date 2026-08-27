package com.poudy.category.controller.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.category.domain.Category;
import com.poudy.product.domain.CategoryProductCount;
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
        CategoryProductCount skinCareCount = new CategoryProductCount(
            skinCare,
            3L,
            List.of(
                new CategoryProductCount(toner, 2L, List.of()),
                new CategoryProductCount(serum, 1L, List.of())
            )
        );
        CategoryProductCount cleansingCount = new CategoryProductCount(
            cleansing,
            4L,
            List.of(new CategoryProductCount(cleansingFoam, 4L, List.of()))
        );

        CategoryListResponse response = CategoryListResponse.from(List.of(skinCareCount, cleansingCount));

        assertThat(response.items()).containsExactly(
            new CategoryResponse(
                1L,
                "스킨케어",
                List.of(new CategoryChildResponse(2L, "토너", 2L), new CategoryChildResponse(3L, "세럼", 1L)),
                3L
            ),
            new CategoryResponse(4L, "클렌징", List.of(new CategoryChildResponse(5L, "클렌징폼", 4L)), 4L)
        );
    }
}
