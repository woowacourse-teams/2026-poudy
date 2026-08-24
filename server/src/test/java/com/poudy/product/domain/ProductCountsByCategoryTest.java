package com.poudy.product.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.category.domain.Category;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("카테고리별 제품 수")
class ProductCountsByCategoryTest {

    @Test
    @DisplayName("집계된 카테고리의 제품 수를 반환한다")
    void returnsProductCount() {
        Category toner = category(2L);
        ProductCountsByCategory productCounts = new ProductCountsByCategory(Map.of(2L, 3L));

        assertThat(productCounts.countOf(toner)).isEqualTo(3L);
    }

    @Test
    @DisplayName("집계되지 않은 카테고리의 제품 수는 0이다")
    void returnsZeroForUncountedCategory() {
        Category toner = category(2L);
        ProductCountsByCategory productCounts = new ProductCountsByCategory(Map.of());

        assertThat(productCounts.countOf(toner)).isZero();
    }

    private static Category category(Long id) {
        return new Category(id, 1L, "카테고리 " + id, 1);
    }
}
