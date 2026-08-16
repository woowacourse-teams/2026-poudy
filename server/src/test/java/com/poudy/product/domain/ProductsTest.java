package com.poudy.product.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.Ingredients;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("제품 목록")
class ProductsTest {

    private static Ingredient ingredient(Long id) {
        return new Ingredient(id, "성분 " + id, null, null, null, null, null, null, null, null);
    }

    private static Product product(Long id, Long... ingredientIds) {
        // spotless:off
        List<Ingredient> ingredients = Arrays.stream(ingredientIds)
                .map(ProductsTest::ingredient)
                .toList();
        // spotless:on

        return new Product(id, 1L, 1L, "제품 " + id, new Ingredients(ingredients));
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
    @DisplayName("성분 ID 가 없어도 제품은 포함 여부를 거짓으로 답한다")
    void answersFalseForMissingId() {
        assertThat(product(1L, 100L).contains(null)).isFalse();
    }
}
