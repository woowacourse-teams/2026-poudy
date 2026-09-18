package com.poudy.product.domain;

import static com.poudy.product.support.ProductSensoryTestFixture.sensory;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.poudy.brand.domain.Brand;
import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.product.domain.sensory.MoistureLevel;
import com.poudy.product.domain.sensory.OilLevel;
import com.poudy.search.domain.SearchKeyword;
import com.poudy.skintype.domain.SkinType;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
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
        20L
    );
    private final Product serum = product(
        2L,
        "진한 토너 세럼",
        1L,
        category(3L, 1L),
        20000L,
        2,
        3,
        10L,
        30L
    );
    private final Product cream = product(
        3L,
        "보습 크림",
        2L,
        category(6L, 5L),
        30000L,
        2,
        3,
        10L,
        30L
    );
    private final Products products = Products.from(List.of(toner, serum, cream));
    private final Categories categories = Categories.from(
        List.of(
            new Category(1L, null, "스킨케어", 0),
            toner.category(),
            serum.category(),
            new Category(5L, null, "크림", 0),
            cream.category()
        )
    );

    @Test
    @DisplayName("서로 다른 필터 종류를 AND 로 결합한다")
    void filtersWithEveryCondition() {
        ProductFilter filter = new ProductFilter(
            new SearchKeyword("토너"),
            List.of(1L),
            List.of(1L),
            List.of(new MoistureLevel(2)),
            List.of(new OilLevel(3)),
            new IngredientFilter(List.of(10L, 30L), List.of(20L)),
            null
        );

        assertThat(products.find(filter, ProductSort.NAME_ASC, 1, 20, categories).items())
            .containsExactly(serum);
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
            new IngredientFilter(null, null),
            null
        );

        assertThat(products.find(filter, ProductSort.NAME_ASC, 1, 20, categories).items())
            .containsExactly(toner, serum);
    }

    @Test
    @DisplayName("페이지 항목과 전체 개수 및 전체 결과의 브랜드와 카테고리를 함께 만든다")
    void createsPageFromAllMatches() {
        ProductFilter filter = new ProductFilter(
            null,
            List.of(),
            List.of(1L),
            List.of(),
            List.of(),
            new IngredientFilter(null, null),
            null
        );

        ProductPage found = products.find(filter, ProductSort.PRICE_DESC, 1, 1, categories);

        assertThat(found.items()).containsExactly(serum);
        assertThat(found.totalElements()).isEqualTo(2);
        assertThat(found.brands()).containsExactly(toner.brand());
        assertThat(found.categories()).hasSize(1);
        assertThat(found.categories().getFirst().id()).isEqualTo(1L);
        assertThat(found.categories().getFirst().productCount()).isEqualTo(2L);
        assertThat(found.categories().getFirst().children())
            .extracting(CategoryProductCount::id, CategoryProductCount::productCount)
            .containsExactly(tuple(2L, 1L), tuple(3L, 1L));
    }

    @Test
    @DisplayName("필터에 맞는 전체 제품의 피부타입을 중복 없이 표시 순서대로 집계한다")
    void aggregatesSkinTypesFromAllMatches() {
        Product dryAndSensitive = product(
            4L,
            "건성 민감 토너",
            1L,
            toner.category(),
            10000L,
            1,
            1,
            Set.of(SkinType.DRY, SkinType.SENSITIVE)
        );
        Product dryAndOily = product(
            5L,
            "건성 지성 토너",
            1L,
            toner.category(),
            20000L,
            1,
            1,
            Set.of(SkinType.DRY, SkinType.OILY)
        );
        Product unclassified = product(
            6L,
            "미분류 토너",
            1L,
            toner.category(),
            30000L,
            1,
            1,
            Set.of()
        );
        Products typedProducts = Products.from(List.of(dryAndSensitive, dryAndOily, unclassified));
        ProductFilter filter = new ProductFilter(
            null,
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            new IngredientFilter(null, null),
            SkinType.DRY
        );

        ProductPage found = typedProducts.find(filter, ProductSort.PRICE_ASC, 1, 1, categories);

        assertThat(found.items()).containsExactly(dryAndSensitive);
        assertThat(found.skinTypes()).containsExactly(SkinType.DRY, SkinType.OILY, SkinType.SENSITIVE);
    }

    @Test
    @DisplayName("목록과 개수는 같은 필터 판정을 사용한다")
    void countsWithSameFilterRule() {
        ProductFilter filter = new ProductFilter(
            new SearchKeyword("토너"),
            List.of(),
            List.of(1L),
            List.of(),
            List.of(),
            new IngredientFilter(null, null),
            null
        );

        assertThat(products.count(filter))
            .isEqualTo(products.find(filter, ProductSort.NAME_ASC, 1, 20, categories).totalElements());
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
        Long... ingredientIds
    ) {
        return product(
            id,
            name,
            brandId,
            category,
            price,
            moistureLevel,
            oilLevel,
            Set.of(),
            ingredientIds
        );
    }

    private static Product product(
        Long id,
        String name,
        Long brandId,
        Category category,
        Long price,
        Integer moistureLevel,
        Integer oilLevel,
        Set<SkinType> skinTypes,
        Long... ingredientIds
    ) {
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
                    null
                )
            )
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
            OffsetDateTime.parse("2026-08-01T00:00:00Z"),
            skinTypes
        );
    }

    private static Category category(Long id, Long parentId) {
        return new Category(id, parentId, "카테고리 " + id, 1);
    }
}
