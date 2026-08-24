package com.poudy.product.domain;

import static com.poudy.product.support.ProductSensoryTestFixture.sensory;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.brand.domain.Brand;
import com.poudy.category.domain.Category;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.Ingredients;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
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

        return product(id, brand(1L), category(1L), new Ingredients(ingredients));
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
    @DisplayName("요청한 ID 순서로 존재하는 제품만 찾는다")
    void findsProductsInRequestedOrder() {
        assertThat(products.findAllById(List.of(3L, 999L, 1L)))
                .extracting(Product::id)
                .containsExactly(3L, 1L);
    }

    @Test
    @DisplayName("제품 ID가 중복되면 목록을 만들 수 없다")
    void rejectsDuplicateProductIds() {
        assertThatThrownBy(() -> new Products(List.of(product(1L), product(1L))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("1");
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
        Category parent = new Category(100L, null, "대분류", 0);
        Category firstChild = category(2L);
        Category secondChild = category(3L);
        Category emptyChild = category(4L);
        Products products = new Products(
                List.of(
                        productOfBrandAndCategory(1L, 1L, 2L),
                        productOfBrandAndCategory(2L, 1L, 2L),
                        productOfBrandAndCategory(3L, 1L, 3L),
                        productOfBrandAndCategory(4L, 2L, 2L)));

        ProductCountsByCategory counts = products.countsByCategoryInBrand(1L);

        assertThat(counts.countOf(parent)).isEqualTo(3L);
        assertThat(counts.countOf(firstChild)).isEqualTo(2L);
        assertThat(counts.countOf(secondChild)).isEqualTo(1L);
        assertThat(counts.countOf(emptyChild)).isZero();
    }

    private static Product productOfBrand(Long id, Long brandId) {
        return product(id, brand(brandId), category(1L), new Ingredients(List.of()));
    }

    private static Product productOfBrandAndCategory(Long id, Long brandId, Long categoryId) {
        return product(id, brand(brandId), category(categoryId), new Ingredients(List.of()));
    }

    private static Product product(Long id, Brand brand, Category category, Ingredients ingredients) {
        ProductVariant variant = new ProductVariant(id, 10000L, new BigDecimal("100"), "ml", "active");

        return new Product(
                id,
                "제품 " + id,
                brand,
                category,
                ingredients,
                "https://example.com/" + id + ".png",
                new ProductVariants(List.of(variant)),
                sensory(1, 1),
                OffsetDateTime.parse("2026-08-01T00:00:00Z"));
    }

    private static Brand brand(Long id) {
        return new Brand(id, "브랜드 " + id, null, null);
    }

    private static Category category(Long id) {
        return new Category(id, 100L, "카테고리 " + id, 1);
    }
}
