package com.poudy.product.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("제품 목록")
class ProductsTest {

    private static Product product(Long id, Long... ingredientIds) {
        return new Product(
                id,
                1L,
                1L,
                "제품 " + id,
                List.of(ingredientIds).stream().map(ProductIngredient::new).toList());
    }

    private final Products products = new Products(
            List.of(product(1L, 100L, 200L), product(2L, 200L, 300L), product(3L, 300L)));

    @Test
    @DisplayName("성분을 포함한 제품 수를 센다")
    void countsProductsContainingIngredient() {
        assertThat(products.countContaining(200L)).isEqualTo(2);
        assertThat(products.countContaining(100L)).isEqualTo(1);
    }

    @Test
    @DisplayName("아무 제품에도 없는 성분은 0 이다")
    void countsZeroForUnusedIngredient() {
        assertThat(products.countContaining(999L)).isZero();
    }

    @Test
    @DisplayName("성분 ID 가 없으면 0 이다")
    void countsZeroForMissingId() {
        assertThat(products.countContaining(null)).isZero();
    }

    @Test
    @DisplayName("카테고리 ID별 제품 수를 센다")
    void countsProductsByCategoryId() {
        Products categorizedProducts = new Products(
                List.of(productInCategory(1L, 2L), productInCategory(2L, 2L), productInCategory(3L, 3L)));

        assertThat(categorizedProducts.countByCategoryId()).containsExactlyInAnyOrderEntriesOf(Map.of(2L, 2L, 3L, 1L));
    }

    @Test
    @DisplayName("제품이 없으면 카테고리별 제품 수도 비어 있다")
    void returnsEmptyCountsWithoutProducts() {
        assertThat(new Products(List.of()).countByCategoryId()).isEmpty();
    }

    private static Product productInCategory(Long id, Long categoryId) {
        return new Product(id, 1L, categoryId, "제품 " + id, List.of());
    }
}
