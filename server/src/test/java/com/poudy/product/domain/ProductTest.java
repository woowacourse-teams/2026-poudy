package com.poudy.product.domain;

import static com.poudy.product.support.ProductSensoryTestFixture.sensory;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.brand.domain.Brand;
import com.poudy.category.domain.Category;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.IngredientTag;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.tag.domain.TagCategory;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("제품")
class ProductTest {

    private final Brand brand = new Brand(1L, "브랜드", null, null);
    private final Category category = new Category(2L, 1L, "카테고리", 1, null, null);
    private final Ingredients ingredients = new Ingredients(List.of());
    private final ProductVariants variants = new ProductVariants(
            List.of(new ProductVariant(1L, 10000L, new BigDecimal("100"), "ml", "active")));
    private final OffsetDateTime updatedAt = OffsetDateTime.parse("2026-08-01T00:00:00Z");

    @Test
    @DisplayName("브랜드가 없으면 만들 수 없다")
    void rejectsMissingBrand() {
        assertThatThrownBy(
                () -> new Product(
                        1L,
                        "제품",
                        null,
                        category,
                        ingredients,
                        "image",
                        variants,
                        sensory(1, 1),
                        updatedAt))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("제품은 브랜드를 가져야 합니다.");
    }

    @Test
    @DisplayName("카테고리가 없으면 만들 수 없다")
    void rejectsMissingCategory() {
        assertThatThrownBy(
                () -> new Product(
                        1L,
                        "제품",
                        brand,
                        null,
                        ingredients,
                        "image",
                        variants,
                        sensory(1, 1),
                        updatedAt))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("제품은 카테고리를 가져야 합니다.");
    }

    @Test
    @DisplayName("대분류만으로는 만들 수 없다")
    void rejectsParentCategory() {
        Category parent = new Category(1L, null, "스킨케어", 0, null, null);

        assertThatThrownBy(
                () -> new Product(
                        1L,
                        "제품",
                        brand,
                        parent,
                        ingredients,
                        "image",
                        variants,
                        sensory(1, 1),
                        updatedAt))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("제품은 소분류 카테고리를 가져야 합니다.");
    }

    @Test
    @DisplayName("같은 피부 작용을 가진 성분을 하나의 그룹으로 묶는다")
    void groupsIngredientsBySkinEffect() {
        Ingredient first = ingredient(10L, "HYDRATION_RELATED");
        Ingredient second = ingredient(20L, "HYDRATION_RELATED");
        Product product = new Product(
                1L,
                "제품",
                brand,
                category,
                new Ingredients(List.of(first, second)),
                "image",
                variants,
                sensory(1, 1),
                updatedAt);

        assertThat(product.skinEffectGroups()).singleElement()
                .satisfies(group -> {
                    assertThat(group.effect().id()).isEqualTo(108L);
                    assertThat(group.ingredientIds()).containsExactly(10L, 20L);
                });
    }

    @Test
    @DisplayName("감각 추론 결과가 없으면 만들 수 없다")
    void rejectsMissingSensory() {
        assertThatThrownBy(
                () -> new Product(
                        1L,
                        "제품",
                        brand,
                        category,
                        ingredients,
                        "image",
                        variants,
                        null,
                        updatedAt))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("제품 감각 추론 결과가 필요합니다.");
    }

    private static Ingredient ingredient(Long id, String effect) {
        IngredientTag tag = new IngredientTag(effect, TagCategory.BIOLOGICAL_EFFECT, "확인된 근거");
        return new Ingredient(id, "성분 " + id, null, null, null, null, null, List.of(tag), null, null);
    }
}
