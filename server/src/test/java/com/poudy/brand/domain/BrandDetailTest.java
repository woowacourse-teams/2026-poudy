package com.poudy.brand.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import com.poudy.category.domain.CategoryCounts;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("브랜드 상세")
class BrandDetailTest {

    @Test
    @DisplayName("제품이 있는 소분류와 그 대분류만 제품 수와 함께 반환한다")
    void returnsCategoriesContainingBrandProducts() {
        Brand brand = new Brand(1L, "닥터지", null, null);
        Category skinCare = parent(1L, "스킨케어");
        Category toner = child(2L, 1L, "토너");
        Category serum = child(3L, 1L, "세럼");
        Category sunCare = parent(4L, "선케어");
        Category sunCream = child(5L, 4L, "선크림");
        Categories categories = new Categories(List.of(skinCare, toner, serum, sunCare, sunCream));
        CategoryCounts categoryCounts = new CategoryCounts(categories, Map.of(2L, 2L, 3L, 1L));
        BrandDetail detail = new BrandDetail(brand, categoryCounts);

        assertThat(detail.brand()).isEqualTo(brand);
        assertThat(detail.categories()).containsExactly(skinCare);
        assertThat(detail.childrenOf(skinCare)).containsExactly(toner, serum);
        assertThat(detail.productCountOf(skinCare)).isEqualTo(3L);
        assertThat(detail.productCountOf(toner)).isEqualTo(2L);
        assertThat(detail.productCountOf(serum)).isEqualTo(1L);
    }

    @Test
    @DisplayName("브랜드 제품이 없으면 카테고리를 반환하지 않는다")
    void returnsEmptyCategoriesForBrandWithoutProducts() {
        Category skinCare = parent(1L, "스킨케어");
        Category toner = child(2L, 1L, "토너");
        CategoryCounts categoryCounts = new CategoryCounts(new Categories(List.of(skinCare, toner)), Map.of());
        BrandDetail detail = new BrandDetail(new Brand(1L, "닥터지", null, null), categoryCounts);

        assertThat(detail.categories()).isEmpty();
    }

    private static Category parent(Long id, String name) {
        return new Category(id, null, name, 0, null, null);
    }

    private static Category child(Long id, Long parentId, String name) {
        return new Category(id, parentId, name, 1, null, null);
    }
}
