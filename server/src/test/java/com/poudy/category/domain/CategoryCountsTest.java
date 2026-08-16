package com.poudy.category.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("카테고리별 제품 수")
class CategoryCountsTest {

    @Test
    @DisplayName("소분류별 제품 수를 더해 대분류 제품 수를 계산한다")
    void aggregatesProductCountsForParents() {
        Category skinCare = parent(1L, "스킨케어");
        Category toner = child(2L, 1L, "토너");
        Category serum = child(3L, 1L, "세럼");
        Category cleansing = parent(4L, "클렌징");
        Category cleansingFoam = child(5L, 4L, "클렌징폼");
        Categories categories = new Categories(List.of(skinCare, toner, serum, cleansing, cleansingFoam));

        CategoryCounts counts = new CategoryCounts(categories, Map.of(2L, 3L, 3L, 2L, 5L, 4L));

        assertThat(counts.productCountOf(toner)).isEqualTo(3L);
        assertThat(counts.productCountOf(serum)).isEqualTo(2L);
        assertThat(counts.productCountOf(skinCare)).isEqualTo(5L);
        assertThat(counts.productCountOf(cleansingFoam)).isEqualTo(4L);
        assertThat(counts.productCountOf(cleansing)).isEqualTo(4L);
    }

    @Test
    @DisplayName("제품이 없는 소분류와 대분류의 제품 수는 0이다")
    void fillsZeroForCategoriesWithoutProducts() {
        Category skinCare = parent(1L, "스킨케어");
        Category toner = child(2L, 1L, "토너");
        Category serum = child(3L, 1L, "세럼");
        Categories categories = new Categories(List.of(skinCare, toner, serum));

        CategoryCounts counts = new CategoryCounts(categories, Map.of());

        assertThat(counts.productCountOf(toner)).isZero();
        assertThat(counts.productCountOf(serum)).isZero();
        assertThat(counts.productCountOf(skinCare)).isZero();
    }

    @Test
    @DisplayName("제품 수는 존재하는 소분류에 대해서만 받을 수 있다")
    void rejectsProductCountsForInvalidCategory() {
        Category skinCare = parent(1L, "스킨케어");
        Category toner = child(2L, 1L, "토너");
        Categories categories = new Categories(List.of(skinCare, toner));

        assertThatThrownBy(() -> new CategoryCounts(categories, Map.of(1L, 1L)))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("제품은 존재하는 소분류에 속해야 합니다.");
        assertThatThrownBy(() -> new CategoryCounts(categories, Map.of(999L, 1L)))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("제품은 존재하는 소분류에 속해야 합니다.");
    }

    private static Category parent(Long id, String name) {
        return new Category(id, null, name, 0, null, null);
    }

    private static Category child(Long id, Long parentId, String name) {
        return new Category(id, parentId, name, 1, null, null);
    }
}
