package com.poudy.brand.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.category.domain.Category;
import com.poudy.category.domain.CountedCategory;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("브랜드 상세")
class BrandDetailTest {

    @Test
    @DisplayName("브랜드 정보와 카테고리별 제품 수를 함께 보관한다")
    void holdsBrandAndCountedCategories() {
        Brand brand = new Brand(1L, "닥터지", null, null);
        CountedCategory toner = new CountedCategory(child(2L, 1L, "토너"), 2L, List.of());
        CountedCategory skinCare = new CountedCategory(parent(1L, "스킨케어"), 3L, List.of(toner));

        BrandDetail detail = new BrandDetail(brand, List.of(skinCare));

        assertThat(detail.id()).isEqualTo(1L);
        assertThat(detail.koreanName()).isEqualTo("닥터지");
        assertThat(detail.englishName()).isNull();
        assertThat(detail.imageUrl()).isNull();
        assertThat(detail.categories()).containsExactly(skinCare);
    }

    @Test
    @DisplayName("카테고리가 없으면 빈 목록을 반환한다")
    void holdsEmptyCategories() {
        BrandDetail detail = new BrandDetail(new Brand(1L, "닥터지", null, null), List.of());

        assertThat(detail.categories()).isEmpty();
    }

    private static Category parent(Long id, String name) {
        return new Category(id, null, name, 0);
    }

    private static Category child(Long id, Long parentId, String name) {
        return new Category(id, parentId, name, 1);
    }
}
