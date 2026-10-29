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
import java.util.ArrayList;
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
    @DisplayName("가격 차이는 대표 용량 옵션끼리 비교해 기준 제품보다 비싸면 양수다")
    void priceDifferenceFromBase() {
        Product base = productWith(
            new ProductVariant(1L, 18000L, new BigDecimal("100"), "ml", "active"),
            new ProductVariant(2L, 30000L, new BigDecimal("200"), "ml", "active")
        );
        Product cheaper = productWith(new ProductVariant(3L, 15000L, new BigDecimal("50"), "ml", "active"));
        Product pricier = productWith(new ProductVariant(4L, 20000L, new BigDecimal("150"), "ml", "active"));

        assertThat(cheaper.priceDifferenceFrom(base)).isEqualTo(-3000L);
        assertThat(pricier.priceDifferenceFrom(base)).isEqualTo(2000L);
        assertThat(base.priceDifferenceFrom(base)).isZero();
    }

    @Test
    @DisplayName("브랜드가 없으면 만들 수 없다")
    void rejectsMissingBrand() {
        assertThatThrownBy(
            () -> new Product(
                1L,
                "제품",
                null,
                category,
                List.of(),
                parts,
                "image",
                variants,
                sensory(1, 1),
                false,
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
                List.of(),
                parts,
                "image",
                variants,
                sensory(1, 1),
                false,
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
                List.of(),
                parts,
                "image",
                variants,
                sensory(1, 1),
                false,
                updatedAt
            )
        )
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("제품은 소분류 카테고리를 가져야 합니다.");
    }

    @Test
    @DisplayName("구성품을 표시 순서대로 갖고 ID로 찾는다")
    void findsPartsInDisplayOrder() {
        Ingredient shared = ingredient(1L, "SHARED");
        Ingredient onlySecond = ingredient(2L, "ONLY_SECOND");
        Product product = new Product(
            1L,
            "제품",
            brand,
            category,
            List.of(),
            List.of(
                new ProductPart(1L, "본품", new Ingredients(List.of(shared))),
                new ProductPart(2L, "리필", new Ingredients(List.of(onlySecond, shared)))
            ),
            "image",
            variants,
            sensory(1, 1),
            false,
            updatedAt
        );

        assertThat(product.parts()).extracting(ProductPart::name).containsExactly("본품", "리필");
        assertThat(product.firstPart()).map(ProductPart::name).contains("본품");
        assertThat(product.findPart(2L)).map(ProductPart::name).contains("리필");
        assertThat(product.findPart(9L)).isEmpty();
    }

    @Test
    @DisplayName("모든 구성품의 성분을 구성품 순서대로 중복 없이 합친다")
    void combinesIngredientsOfAllParts() {
        Ingredient shared = ingredient(1L, "SHARED");
        Ingredient onlySecond = ingredient(2L, "ONLY_SECOND");
        Product product = new Product(
            1L,
            "제품",
            brand,
            category,
            List.of(),
            List.of(
                new ProductPart(1L, "본품", new Ingredients(List.of(shared))),
                new ProductPart(2L, "리필", new Ingredients(List.of(onlySecond, shared)))
            ),
            "image",
            variants,
            sensory(1, 1),
            false,
            updatedAt
        );

        assertThat(product.ingredients()).containsExactly(shared, onlySecond);
    }

    @Test
    @DisplayName("성분 ID로 포함 여부를 판단하고 합친 전성분에서 처음 나온 위치를 찾는다")
    void judgesIngredientsAcrossParts() {
        Product product = productWithParts(
            List.of(
                new ProductPart(
                    1L,
                    "본품",
                    new Ingredients(
                        List.of(
                            ingredient(1L, "FIRST"),
                            ingredient(2L, "SHARED")
                        )
                    )
                ),
                new ProductPart(
                    2L,
                    "리필",
                    new Ingredients(
                        List.of(
                            ingredient(2L, "SAME_ID"),
                            ingredient(3L, "SECOND_PART"),
                            ingredient(1L, "SAME_FIRST_ID")
                        )
                    )
                )
            )
        );

        assertThat(product.containsIngredient(1L)).isTrue();
        assertThat(product.containsIngredient(3L)).isTrue();
        assertThat(product.containsIngredient(9L)).isFalse();
        assertThat(product.ingredientPosition(1L)).isZero();
        assertThat(product.ingredientPosition(2L)).isEqualTo(1);
        assertThat(product.ingredientPosition(3L)).isEqualTo(2);
        assertThat(product.ingredientPosition(9L)).isEqualTo(-1);
    }

    @Test
    @DisplayName("구성품이 없으면 성분을 포함하지 않고 위치도 없다")
    void hasNoIngredientsWithoutParts() {
        Product product = productWithParts(List.of());

        assertThat(product.containsIngredient(1L)).isFalse();
        assertThat(product.ingredientPosition(1L)).isEqualTo(-1);
    }

    private Product productWithParts(List<ProductPart> productParts) {
        return new Product(
            1L,
            "제품",
            brand,
            category,
            List.of(),
            productParts,
            "image",
            variants,
            sensory(1, 1),
            false,
            updatedAt
        );
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
                List.of(),
                parts,
                "image",
                variants,
                null,
                false,
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
        return Ingredient.create(id, "성분 " + id, null, null, null, null, List.of(tag), null);
    }

    @Test
    void ownsAnImmutableCopyOfMarks() {
        List<Mark> marks = new ArrayList<>(List.of(Mark.DAISO));
        Product product = new Product(
            1L,
            "제품",
            brand,
            category,
            marks,
            parts,
            "image",
            variants,
            sensory(1, 1),
            false,
            updatedAt
        );
        marks.clear();

        assertThat(product.marks()).extracting(Mark::code).containsExactly("DAISO");
        assertThatThrownBy(() -> product.marks().clear()).isInstanceOf(UnsupportedOperationException.class);
    }

    private Product productWith(ProductVariant... options) {
        return new Product(
            1L,
            "제품",
            brand,
            category,
            List.of(),
            parts,
            "image",
            new ProductVariants(List.of(options)),
            sensory(1, 1),
            false,
            updatedAt
        );
    }
}
