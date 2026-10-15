package com.poudy.shelf.domain;

import static com.poudy.product.support.ProductSensoryTestFixture.sensory;
import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.brand.domain.Brand;
import com.poudy.category.domain.Category;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.ProductPart;
import com.poudy.product.domain.ProductVariant;
import com.poudy.product.domain.ProductVariants;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("안 맞을 수 있는 성분")
class SuspectIngredientsTest {

    private static final long LIMONENE = 1L;
    private static final long LINALOOL = 2L;
    private static final long ALCOHOL = 3L;
    private static final long PHENOXYETHANOL = 4L;
    private static final long LAVENDER_OIL = 5L;
    private static final long WATER = 100L;

    private static final SuspectCandidates CANDIDATES = new SuspectCandidates(
        Set.of(LIMONENE, LINALOOL, ALCOHOL, PHENOXYETHANOL),
        Set.of()
    );

    @Test
    @DisplayName("안 맞은 제품이 없으면 고르지 않는다")
    void noUnsuitedProduct() {
        SuspectIngredients suspects = SuspectIngredients.of(List.of(), List.of(product(1L, LIMONENE)), CANDIDATES);

        assertThat(suspects.items()).isEmpty();
    }

    @Test
    @DisplayName("후보 성분만 고르고 점수가 같으면 전성분에서 먼저 나온 성분이 앞선다")
    void choosesCandidatesInLabelOrder() {
        SuspectIngredients suspects = SuspectIngredients.of(
            List.of(product(1L, WATER, LINALOOL, LIMONENE)),
            List.of(),
            CANDIDATES
        );

        assertThat(suspects.ingredientIds()).containsExactly(LINALOOL, LIMONENE);
    }

    @Test
    @DisplayName("더 많은 안 맞은 제품에 든 성분이 앞서고, 성분마다 그 성분이 든 안 맞은 제품을 함께 준다")
    void ranksByUnsuitedProducts() {
        Product toner = product(1L, PHENOXYETHANOL, LIMONENE);
        Product cream = product(2L, LIMONENE);

        SuspectIngredients suspects = SuspectIngredients.of(List.of(toner, cream), List.of(), CANDIDATES);

        assertThat(suspects.ingredientIds()).containsExactly(LIMONENE, PHENOXYETHANOL);
        assertThat(suspects.items().getFirst().unsuitedProducts()).containsExactly(toner, cream);
        assertThat(suspects.items().get(1).unsuitedProducts()).containsExactly(toner);
    }

    @Test
    @DisplayName("잘 맞은 제품에도 든 성분은 점수를 깎아 뒤로 보내고, 0 이하가 되면 숨긴다")
    void offsetsBySuitedProducts() {
        List<Product> unsuited = List
            .of(product(1L, PHENOXYETHANOL, ALCOHOL, LIMONENE), product(2L, PHENOXYETHANOL, ALCOHOL, LIMONENE));
        List<Product> suited = List.of(
            product(3L, PHENOXYETHANOL, ALCOHOL),
            product(4L, PHENOXYETHANOL),
            product(5L, WATER, PHENOXYETHANOL)
        );

        SuspectIngredients suspects = SuspectIngredients.of(unsuited, suited, CANDIDATES);

        assertThat(suspects.ingredientIds()).containsExactly(LIMONENE, ALCOHOL);
        assertThat(suspects.items().getFirst().score()).isGreaterThan(suspects.items().get(1).score());
    }

    @Test
    @DisplayName("잘 맞은 제품에 없는 성분은 점수가 0 이하여도 숨기지 않는다")
    void keepsWithoutSuitedEvidence() {
        List<Product> unsuited = List.of(
            product(1L, LIMONENE, LINALOOL),
            product(2L, LIMONENE),
            product(3L, ALCOHOL),
            product(4L, PHENOXYETHANOL)
        );

        SuspectIngredients suspects = SuspectIngredients.of(unsuited, List.of(), CANDIDATES);

        assertThat(suspects.ingredientIds()).containsExactly(LIMONENE, ALCOHOL, PHENOXYETHANOL, LINALOOL);
    }

    @Test
    @DisplayName("피부 타입 주의 성분은 후보에 더하고 점수를 올리지만, 상쇄된 성분을 되살리지 않는다")
    void bonusesCautionIngredients() {
        SuspectCandidates candidates = new SuspectCandidates(
            Set.of(LIMONENE, PHENOXYETHANOL),
            Set.of(LAVENDER_OIL, PHENOXYETHANOL)
        );
        List<Product> unsuited = List.of(
            product(1L, LIMONENE, LAVENDER_OIL, PHENOXYETHANOL),
            product(2L, LIMONENE, LAVENDER_OIL, PHENOXYETHANOL)
        );
        List<Product> suited = List.of(product(3L, PHENOXYETHANOL), product(4L, PHENOXYETHANOL));

        SuspectIngredients suspects = SuspectIngredients.of(unsuited, suited, candidates);

        assertThat(suspects.ingredientIds()).containsExactly(LAVENDER_OIL, LIMONENE);
        assertThat(suspects.items().getFirst().score()).isEqualTo(suspects.items().get(1).score() + 0.1);
    }

    @Test
    @DisplayName("구성품이 여러 개면 성분을 합쳐 한 제품으로 센다")
    void countsMultiPartProductOnce() {
        Product kit = product(1L, List.of(new Long[] {LIMONENE}, new Long[] {LIMONENE, ALCOHOL}));

        SuspectIngredients suspects = SuspectIngredients.of(List.of(kit, product(2L, LIMONENE)), List.of(), CANDIDATES);

        assertThat(suspects.ingredientIds()).containsExactly(LIMONENE, ALCOHOL);
        assertThat(suspects.items().getFirst().unsuitedProducts()).hasSize(2);
    }

    @Test
    @DisplayName("동률이면 구성품을 합치고 중복을 뺀 전성분 순서로 정렬한다")
    void ordersTiesByCombinedIngredientPosition() {
        Product kit = product(
            1L,
            List.of(
                new Long[] {WATER, LINALOOL},
                new Long[] {WATER, ALCOHOL, LIMONENE}
            )
        );

        SuspectIngredients suspects = SuspectIngredients.of(List.of(kit), List.of(), CANDIDATES);

        assertThat(suspects.ingredientIds()).containsExactly(LINALOOL, ALCOHOL, LIMONENE);
    }

    @Test
    @DisplayName("고른 성분이 하나라도 든 제품을 알아본다")
    void tellsProductContainingSuspect() {
        SuspectIngredients suspects = SuspectIngredients.of(List.of(product(1L, LIMONENE)), List.of(), CANDIDATES);

        assertThat(suspects.isContainedIn(product(2L, WATER, LIMONENE))).isTrue();
        assertThat(suspects.isContainedIn(product(3L, WATER, ALCOHOL))).isFalse();
    }

    private static Product product(Long id, Long... ingredientIds) {
        return product(id, List.<Long[]>of(ingredientIds));
    }

    private static Product product(Long id, List<Long[]> partIngredientIds) {
        List<ProductPart> parts = partIngredientIds.stream()
            .map(
                ids -> new ProductPart(
                    id,
                    null,
                    new Ingredients(Arrays.stream(ids).map(SuspectIngredientsTest::ingredient).toList())
                )
            )
            .toList();
        return new Product(
            id,
            "제품 " + id,
            new Brand(1L, "브랜드", null, null),
            new Category(1L, 100L, "카테고리", 1),
            List.of(),
            parts,
            "https://example.com/" + id + ".png",
            new ProductVariants(List.of(new ProductVariant(id, 10000L, new BigDecimal("100"), "ml", "active"))),
            sensory(1, 1),
            false,
            OffsetDateTime.parse("2026-08-01T00:00:00Z")
        );
    }

    private static Ingredient ingredient(Long id) {
        return new Ingredient(id, "성분 " + id, null, null, null, null, null, null);
    }
}
