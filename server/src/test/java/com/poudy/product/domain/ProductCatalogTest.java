package com.poudy.product.domain;

import static com.poudy.product.support.ProductSensoryTestFixture.sensory;
import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.brand.domain.Brand;
import com.poudy.category.domain.Category;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.product.domain.sensory.MoistureLevel;
import com.poudy.product.domain.sensory.OilLevel;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("제품 카탈로그")
class ProductCatalogTest {

    private final Product toner = product(
            1L,
            "산뜻 토너",
            1L,
            category(2L, 1L),
            10000L,
            3,
            1,
            10L,
            20L);
    private final Product serum = product(
            2L,
            "진한 토너 세럼",
            1L,
            category(3L, 1L),
            20000L,
            2,
            3,
            10L,
            30L);
    private final Product cream = product(
            3L,
            "보습 크림",
            2L,
            category(6L, 5L),
            30000L,
            2,
            3,
            10L,
            30L);
    private final Products products = new Products(List.of(toner, serum, cream));

    @Test
    @DisplayName("서로 다른 필터 종류를 AND 로 결합한다")
    void filtersWithEveryCondition() {
        ProductFilter filter = new ProductFilter(
                "토너",
                List.of(1L),
                List.of(1L),
                List.of(new MoistureLevel(2)),
                List.of(new OilLevel(3)),
                new IngredientFilter(List.of(10L, 30L), List.of(20L)));

        assertThat(products.find(filter, ProductSort.NAME_ASC, 0, 20).items()).containsExactly(serum);
    }

    @Test
    @DisplayName("대분류를 고르면 그 아래 소분류 제품을 찾는다")
    void filtersByParentCategory() {
        ProductFilter filter = new ProductFilter(
                null,
                List.of(1L),
                List.of(),
                List.of(),
                List.of(),
                new IngredientFilter(null, null));

        assertThat(products.find(filter, ProductSort.NAME_ASC, 0, 20).items())
                .containsExactly(toner, serum);
    }

    @Test
    @DisplayName("페이지 항목과 전체 개수 및 전체 결과 브랜드를 함께 만든다")
    void createsPageFromAllMatches() {
        ProductFilter filter = new ProductFilter(
                null,
                List.of(),
                List.of(1L),
                List.of(),
                List.of(),
                new IngredientFilter(null, null));

        ProductPage found = products.find(filter, ProductSort.PRICE_DESC, 0, 1);

        assertThat(found.items()).containsExactly(serum);
        assertThat(found.totalElements()).isEqualTo(2);
        assertThat(found.brands()).containsExactly(toner.brand());
    }

    @Test
    @DisplayName("목록과 개수는 같은 필터 판정을 사용한다")
    void countsWithSameFilterRule() {
        ProductFilter filter = new ProductFilter(
                "토너",
                List.of(),
                List.of(1L),
                List.of(),
                List.of(),
                new IngredientFilter(null, null));

        assertThat(products.count(filter))
                .isEqualTo(products.find(filter, ProductSort.NAME_ASC, 0, 20).totalElements());
    }

    @Test
    @DisplayName("제품 ID 로 제품을 찾는다")
    void findsById() {
        assertThat(products.findById(2L)).contains(serum);
        assertThat(products.findById(999L)).isEmpty();
    }

    private static Product product(
            Long id,
            String name,
            Long brandId,
            Category category,
            Long price,
            Integer moistureLevel,
            Integer oilLevel,
            Long... ingredientIds) {
        List<Ingredient> ingredients = Arrays.stream(ingredientIds)
                .map(
                        ingredientId -> new Ingredient(
                                ingredientId,
                                "성분 " + ingredientId,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null))
                .toList();
        ProductVariant variant = new ProductVariant(id, price, new BigDecimal("100"), "ml", "active");

        return new Product(
                id,
                name,
                new Brand(brandId, "브랜드 " + brandId, null, null),
                category,
                new Ingredients(ingredients),
                "https://example.com/" + id + ".png",
                new ProductVariants(List.of(variant)),
                sensory(moistureLevel, oilLevel),
                OffsetDateTime.parse("2026-08-01T00:00:00Z"));
    }

    private static Category category(Long id, Long parentId) {
        return new Category(id, parentId, "카테고리 " + id, 1);
    }
}
