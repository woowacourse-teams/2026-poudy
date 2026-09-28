package com.poudy.product.domain;

import static com.poudy.product.support.ProductSensoryTestFixture.sensory;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.brand.domain.Brand;
import com.poudy.category.domain.Category;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.IngredientTag;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.tag.domain.Tag;
import com.poudy.tag.domain.TagCategory;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("제품")
class ProductTest {

    private final Brand brand = new Brand(1L, "브랜드", null, null);
    private final Category category = new Category(2L, 1L, "카테고리", 1);
    private final List<ProductPart> parts = List.of();
    private final ProductVariants variants = new ProductVariants(
        List.of(new ProductVariant(1L, 10000L, new BigDecimal("100"), "ml", "active"))
    );
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
                parts,
                "image",
                variants,
                sensory(1, 1),
                updatedAt
            )
        )
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
                parts,
                "image",
                variants,
                sensory(1, 1),
                updatedAt
            )
        )
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("제품은 카테고리를 가져야 합니다.");
    }

    @Test
    @DisplayName("대분류만으로는 만들 수 없다")
    void rejectsParentCategory() {
        Category parent = new Category(1L, null, "스킨케어", 0);

        assertThatThrownBy(
            () -> new Product(
                1L,
                "제품",
                brand,
                parent,
                parts,
                "image",
                variants,
                sensory(1, 1),
                updatedAt
            )
        )
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("제품은 소분류 카테고리를 가져야 합니다.");
    }

    @Test
    @DisplayName("여러 구성품에 겹친 성분은 제품 성분에 한 번만 담는다")
    void mergesDuplicateIngredientsAcrossParts() {
        Ingredient shared = ingredient(1L, "SHARED");
        Ingredient onlySecond = ingredient(2L, "ONLY_SECOND");
        Product product = new Product(
            1L,
            "제품",
            brand,
            category,
            List.of(
                new ProductPart(1L, "본품", new Ingredients(List.of(shared))),
                new ProductPart(2L, "리필", new Ingredients(List.of(onlySecond, shared)))
            ),
            "image",
            variants,
            sensory(1, 1),
            updatedAt
        );

        assertThat(product.ingredientIds()).containsExactly(1L, 2L);
        assertThat(product.parts()).extracting(ProductPart::name).containsExactly("본품", "리필");
        assertThat(product.firstPart()).map(ProductPart::name).contains("본품");
        assertThat(product.findPart(2L)).map(ProductPart::name).contains("리필");
        assertThat(product.findPart(9L)).isEmpty();
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
                parts,
                "image",
                variants,
                null,
                updatedAt
            )
        )
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("제품 수분감·유분감 단계가 필요합니다.");
    }

    private static Ingredient ingredient(Long id, String effect) {
        IngredientTag tag = new IngredientTag(
            new Tag(effect, TagCategory.BIOLOGICAL_EFFECT, "피부 작용"),
            List.of("확인된 근거")
        );
        return new Ingredient(id, "성분 " + id, null, null, null, null, List.of(tag), null);
    }
}
