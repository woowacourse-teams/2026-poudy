package com.poudy.product.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.brand.domain.Brand;
import com.poudy.category.domain.Category;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.Ingredients;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("제품 목록")
class ProductsTest {

    private static Ingredient ingredient(Long id) {
        return new Ingredient(id, "성분 " + id, null, null, null, null, null, null, null, null);
    }

    private static Product product(Long id, Long... ingredientIds) {
        List<Ingredient> ingredients = Arrays.stream(ingredientIds)
                .map(ProductsTest::ingredient)
                .toList();

        return new Product(id, brand(1L), category(1L), "제품 " + id, new Ingredients(ingredients));
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

    @Test
    @DisplayName("브랜드별 제품 수를 센다")
    void countsProductsByBrandId() {
        Products products = new Products(
                List.of(productOfBrand(1L, 1L), productOfBrand(2L, 1L), productOfBrand(3L, 2L)));

        assertThat(products.countByBrandId()).isEqualTo(Map.of(1L, 2L, 2L, 1L));
    }

    @Test
    @DisplayName("지정한 브랜드 제품만 카테고리별로 센다")
    void countsProductsByCategoryIdWithinBrand() {
        Products products = new Products(
                List.of(
                        productOfBrandAndCategory(1L, 1L, 2L),
                        productOfBrandAndCategory(2L, 1L, 2L),
                        productOfBrandAndCategory(3L, 1L, 3L),
                        productOfBrandAndCategory(4L, 2L, 2L)));

        assertThat(products.countByCategoryIdInBrand(1L)).isEqualTo(Map.of(2L, 2L, 3L, 1L));
    }

    private static Product productOfBrand(Long id, Long brandId) {
        return new Product(id, brand(brandId), category(1L), "제품 " + id, new Ingredients(List.of()));
    }

    private static Product productOfBrandAndCategory(Long id, Long brandId, Long categoryId) {
        return new Product(id, brand(brandId), category(categoryId), "제품 " + id, new Ingredients(List.of()));
    }

    private static Brand brand(Long id) {
        return new Brand(id, "브랜드 " + id, null, null);
    }

    private static Category category(Long id) {
        return new Category(id, 100L, "카테고리 " + id, 1, null, null);
    }
}
