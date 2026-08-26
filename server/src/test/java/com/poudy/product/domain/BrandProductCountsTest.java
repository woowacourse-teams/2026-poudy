package com.poudy.product.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.brand.domain.Brand;
import com.poudy.category.domain.Category;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("브랜드 제품 수")
class BrandProductCountsTest {

    @Test
    @DisplayName("브랜드 정보와 카테고리별 제품 수를 함께 보관한다")
    void holdsBrandAndCategoryProductCounts() {
        Brand brand = new Brand(1L, "닥터지", null, null);
        CategoryProductCount toner = new CategoryProductCount(child(2L, 1L, "토너"), 2L, List.of());
        CategoryProductCount skinCare = new CategoryProductCount(parent(1L, "스킨케어"), 3L, List.of(toner));

        BrandProductCounts counts = new BrandProductCounts(brand, List.of(skinCare));

        assertThat(counts.id()).isEqualTo(1L);
        assertThat(counts.koreanName()).isEqualTo("닥터지");
        assertThat(counts.englishName()).isNull();
        assertThat(counts.imageUrl()).isNull();
        assertThat(counts.categories()).containsExactly(skinCare);
    }

    @Test
    @DisplayName("카테고리별 제품 수가 없으면 빈 목록을 반환한다")
    void holdsEmptyCategories() {
        BrandProductCounts counts = new BrandProductCounts(new Brand(1L, "닥터지", null, null), List.of());

        assertThat(counts.categories()).isEmpty();
    }

    private static Category parent(Long id, String name) {
        return new Category(id, null, name, 0);
    }

    private static Category child(Long id, Long parentId, String name) {
        return new Category(id, parentId, name, 1);
    }
}
