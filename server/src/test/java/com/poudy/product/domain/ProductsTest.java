package com.poudy.product.domain;

import static com.poudy.product.support.ProductSensoryTestFixture.sensory;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;

import com.poudy.brand.domain.Brand;
import com.poudy.category.domain.Categories;
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

    private final Products products = Products.from(
        List.of(product(1L, 100L, 200L), product(2L, 200L, 300L), product(3L, 300L))
    );

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
        assertThatThrownBy(() -> Products.from(List.of(product(1L), product(1L))))
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
    @DisplayName("카테고리 후보를 먼저 고른 뒤 조회수로 최대 개수만큼 정렬한다")
    void ranksFilteredProductsByViewCount() {
        Products products = Products.from(
            List.of(
                productOfCategory(1L, 2L),
                productOfCategory(2L, 2L),
                productOfCategory(3L, 2L),
                productOfCategory(4L, 2L),
                productOfCategory(5L, 2L),
                productOfCategory(6L, 2L),
                productOfCategory(7L, 2L),
                productOfCategory(8L, 3L)
            )
        );
        Map<Long, Long> viewCounts = Map.of(
            1L,
            1L,
            2L,
            2L,
            3L,
            3L,
            4L,
            4L,
            5L,
            5L,
            6L,
            6L,
            7L,
            7L,
            8L,
            100L
        );

        assertThat(products.rankByViewCounts(List.of(2L), viewCounts))
            .extracting(Product::id)
            .containsExactly(7L, 6L, 5L, 4L, 3L, 2L);
    }

    @Test
    @DisplayName("카테고리는 OR로 결합하고 부모 카테고리는 자식 제품을 포함한다")
    void ranksProductsInAnyRequestedCategory() {
        Products products = Products.from(
            List.of(productOfCategory(1L, 2L), productOfCategory(2L, 3L), productOfCategory(3L, 4L))
        );

        assertThat(products.rankByViewCounts(List.of(2L, 3L), Map.of()))
            .extracting(Product::id)
            .containsExactly(1L, 2L);
        assertThat(products.rankByViewCounts(List.of(100L), Map.of()))
            .extracting(Product::id)
            .containsExactly(1L, 2L, 3L);
        assertThat(products.rankByViewCounts(List.of(999L), Map.of())).isEmpty();
    }

    @Test
    @DisplayName("카테고리와 조회 기록이 없으면 전체 제품을 대상으로 동점에서 카탈로그 순서를 유지한다")
    void keepsCatalogOrderForEqualAndMissingViewCounts() {
        Products products = Products.from(
            List.of(productOfCategory(1L, 2L), productOfCategory(2L, 2L), productOfCategory(3L, 2L))
        );

        assertThat(products.rankByViewCounts(List.of(), Map.of(2L, 5L, 3L, 5L)))
            .extracting(Product::id)
            .containsExactly(2L, 3L, 1L);
    }

    @Test
    @DisplayName("브랜드별 제품 수를 센다")
    void countsProductsByBrand() {
        Products products = Products.from(
            List.of(productOfBrand(1L, 1L), productOfBrand(2L, 1L), productOfBrand(3L, 2L))
        );

        assertThat(products.productCountsByBrand(List.of(brand(1L), brand(2L), brand(999L))))
            .extracting(BrandProductCount::id, BrandProductCount::productCount)
            .containsExactly(tuple(1L, 2L), tuple(2L, 1L), tuple(999L, 0L));
    }

    @Test
    @DisplayName("지정한 브랜드 제품만 카테고리별로 센다")
    void countsProductsByCategoryIdWithinBrand() {
        Category parent = new Category(100L, null, "대분류", 0);
        Category firstChild = category(2L);
        Category secondChild = category(3L);
        Category emptyChild = category(4L);
        Products products = Products.from(
            List.of(
                productOfBrandAndCategory(1L, 1L, 2L),
                productOfBrandAndCategory(2L, 1L, 2L),
                productOfBrandAndCategory(3L, 1L, 3L),
                productOfBrandAndCategory(4L, 2L, 2L)
            )
        );

        Categories categories = Categories.from(List.of(parent, firstChild, secondChild, emptyChild));

        BrandProductCounts counts = products.brandProductCountsOf(brand(1L), categories);

        assertThat(counts.categories())
            .extracting(CategoryProductCount::id, CategoryProductCount::productCount)
            .containsExactly(tuple(parent.id(), 3L));
        assertThat(counts.categories().getFirst().children())
            .extracting(CategoryProductCount::id, CategoryProductCount::productCount)
            .containsExactly(tuple(firstChild.id(), 2L), tuple(secondChild.id(), 1L));
    }

    private static Product productOfBrand(Long id, Long brandId) {
        return product(id, brand(brandId), category(1L), new Ingredients(List.of()));
    }

    private static Product productOfCategory(Long id, Long categoryId) {
        return product(id, brand(1L), category(categoryId), new Ingredients(List.of()));
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
            OffsetDateTime.parse("2026-08-01T00:00:00Z"),
            java.util.Set.of()
        );
    }

    private static Brand brand(Long id) {
        return new Brand(id, "브랜드 " + id, null, null);
    }

    private static Category category(Long id) {
        return new Category(id, 100L, "카테고리 " + id, 1);
    }
}
