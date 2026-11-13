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
import com.poudy.skintype.domain.SkinType;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.LongStream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("평가한 제품의 성분 분석")
class RatedProductsTest {

    private static final long LIMONENE = 1L;
    private static final long LINALOOL = 2L;
    private static final long ALCOHOL = 3L;
    private static final long PHENOXYETHANOL = 4L;
    private static final long LAVENDER_OIL = 5L;
    private static final long WATER = 100L;
    private static final Category FACE_LEAVE_ON_CATEGORY = new Category(4L, 1L, "크림", 1);
    private static final Category BRIEF_CONTACT_CATEGORY = new Category(11L, 10L, "클렌징폼/젤", 1);
    private static final Category LEFT_ON_FACE_CLEANSING_CATEGORY = new Category(19L, 10L, "워터/밀크", 1);

    private static final SuspectCandidates CANDIDATES = SuspectCandidates.of(
        Set.of(LIMONENE, LINALOOL, ALCOHOL, PHENOXYETHANOL),
        Set.of(),
        Map.of()
    );

    @Test
    @DisplayName("안 맞은 제품이 없으면 고르지 않는다")
    void noUnsuitedProduct() {
        SuspectIngredients suspects = new RatedProducts(List.of(), List.of(product(1L, LIMONENE)))
            .suspectIngredients(CANDIDATES);

        assertThat(suspects.items()).isEmpty();
    }

    @Test
    @DisplayName("후보 성분만 고르고 점수가 같으면 전성분에서 먼저 나온 성분이 앞선다")
    void choosesCandidatesInLabelOrder() {
        SuspectIngredients suspects = new RatedProducts(List.of(product(1L, WATER, LINALOOL, LIMONENE)), List.of())
            .suspectIngredients(CANDIDATES);

        assertThat(suspects.ingredientIds()).containsExactly(LINALOOL, LIMONENE);
    }

    @Test
    @DisplayName("더 많은 안 맞은 제품에 든 성분이 앞서고, 성분마다 그 성분이 든 안 맞은 제품을 함께 준다")
    void ranksByUnsuitedProducts() {
        Product toner = product(1L, PHENOXYETHANOL, LIMONENE);
        Product cream = product(2L, LIMONENE);

        SuspectIngredients suspects = new RatedProducts(List.of(toner, cream), List.of())
            .suspectIngredients(CANDIDATES);

        assertThat(suspects.ingredientIds()).containsExactly(LIMONENE, PHENOXYETHANOL);
        assertThat(suspects.items().getFirst().unsuitedProducts()).containsExactly(toner, cream);
        assertThat(suspects.items().get(1).unsuitedProducts()).containsExactly(toner);
    }

    @Test
    @DisplayName("잘 맞은 제품에 든 비율이 안 맞은 제품에 든 비율 이상인 성분만 숨긴다")
    void offsetsBySuitedProducts() {
        List<Product> unsuited = List
            .of(product(1L, PHENOXYETHANOL, ALCOHOL, LIMONENE), product(2L, PHENOXYETHANOL, ALCOHOL, LIMONENE));
        List<Product> suited = List.of(
            product(3L, PHENOXYETHANOL, ALCOHOL),
            product(4L, PHENOXYETHANOL),
            product(5L, WATER, PHENOXYETHANOL)
        );

        SuspectIngredients suspects = new RatedProducts(unsuited, suited).suspectIngredients(CANDIDATES);

        assertThat(suspects.ingredientIds()).containsExactly(LIMONENE, ALCOHOL);
    }

    @Test
    @DisplayName("안 맞은 제품 여럿에 든 성분은 잘 맞은 제품 하나로 숨기지 않는다")
    void keepsWhenUnsuitedProductsOutnumber() {
        List<Product> unsuited = List.of(product(1L, LIMONENE), product(2L, LIMONENE), product(3L, LIMONENE));

        SuspectIngredients suspects = new RatedProducts(unsuited, List.of(product(4L, LIMONENE)))
            .suspectIngredients(CANDIDATES);

        assertThat(suspects.ingredientIds()).containsExactly(LIMONENE);
    }

    @Test
    @DisplayName("씻어내거나 얼굴이 아닌 곳에 쓰는 잘 맞은 제품은 얼굴에 남는 안 맞은 제품의 성분을 숨기지 않는다")
    void ignoresBriefContactSuitedProductsForLeaveOnFaceProducts() {
        Product cleanser = product(2L, BRIEF_CONTACT_CATEGORY, LIMONENE);

        SuspectIngredients forCream = new RatedProducts(List.of(product(1L, LIMONENE)), List.of(cleanser))
            .suspectIngredients(CANDIDATES);
        SuspectIngredients forCleanser = new RatedProducts(
            List.of(product(3L, BRIEF_CONTACT_CATEGORY, LIMONENE)),
            List.of(cleanser)
        ).suspectIngredients(CANDIDATES);
        SuspectIngredients byCream = new RatedProducts(
            List.of(product(3L, BRIEF_CONTACT_CATEGORY, LIMONENE)),
            List.of(product(4L, LIMONENE))
        ).suspectIngredients(CANDIDATES);

        SuspectIngredients forWipedCleanser = new RatedProducts(
            List.of(product(1L, LIMONENE)),
            List.of(product(5L, LEFT_ON_FACE_CLEANSING_CATEGORY, LIMONENE))
        ).suspectIngredients(CANDIDATES);

        assertThat(forCream.ingredientIds()).containsExactly(LIMONENE);
        assertThat(forWipedCleanser.ingredientIds()).isEmpty();
        assertThat(forCleanser.ingredientIds()).isEmpty();
        assertThat(byCream.ingredientIds()).isEmpty();
    }

    @Test
    @DisplayName("근거가 같으면 노출이 다른 제품에 든 성분도 점수가 같다")
    void scoresEquallyAcrossContactLevels() {
        List<Product> unsuited = List.of(
            product(1L, LIMONENE),
            product(2L, BRIEF_CONTACT_CATEGORY, WATER, LINALOOL)
        );
        List<Product> suited = List.of(
            product(3L, WATER),
            product(4L, WATER),
            product(5L, WATER),
            product(6L, BRIEF_CONTACT_CATEGORY, WATER),
            product(7L, BRIEF_CONTACT_CATEGORY, WATER)
        );

        SuspectIngredients suspects = new RatedProducts(unsuited, suited).suspectIngredients(CANDIDATES);

        assertThat(suspects.ingredientIds()).containsExactly(LIMONENE, LINALOOL);
        assertThat(suspects.items().getFirst().score()).isEqualTo(suspects.items().get(1).score());
    }

    @Test
    @DisplayName("피부 타입 주의 성분은 후보에 더하고 점수가 같을 때 앞세우지만, 상쇄된 성분을 되살리지 않는다")
    void prefersCautionIngredientsOnTie() {
        SuspectCandidates candidates = SuspectCandidates.of(
            Set.of(LIMONENE, PHENOXYETHANOL),
            Set.of(),
            Map.of(SkinCaution.SENSITIVE_SKIN, Set.of(LAVENDER_OIL, PHENOXYETHANOL))
        );
        List<Product> unsuited = List.of(
            product(1L, LIMONENE, LAVENDER_OIL, PHENOXYETHANOL),
            product(2L, LIMONENE, LAVENDER_OIL, PHENOXYETHANOL)
        );
        List<Product> suited = List.of(product(3L, PHENOXYETHANOL), product(4L, PHENOXYETHANOL));

        SuspectIngredients suspects = new RatedProducts(unsuited, suited).suspectIngredients(candidates);

        assertThat(suspects.ingredientIds()).containsExactly(LAVENDER_OIL, LIMONENE);
        assertThat(suspects.items().getFirst().score()).isEqualTo(suspects.items().get(1).score());
    }

    @Test
    @DisplayName("안 맞은 제품이 많아도 더 많은 안 맞은 제품에 든 성분이 피부 타입 주의 성분보다 앞선다")
    void ranksUnsuitedProductsAboveCaution() {
        SuspectCandidates candidates = SuspectCandidates.of(
            Set.of(LIMONENE),
            Set.of(),
            Map.of(SkinCaution.SENSITIVE_SKIN, Set.of(LAVENDER_OIL))
        );
        List<Product> unsuited = new ArrayList<>(
            List.of(
                product(1L, LAVENDER_OIL, LIMONENE),
                product(2L, LIMONENE)
            )
        );
        unsuited.addAll(
            LongStream.rangeClosed(3L, 10L).mapToObj(id -> product(id, WATER)).toList()
        );

        SuspectIngredients suspects = new RatedProducts(unsuited, List.of()).suspectIngredients(candidates);

        assertThat(suspects.ingredientIds()).containsExactly(LIMONENE, LAVENDER_OIL);
    }

    @Test
    @DisplayName("여러 피부 조건의 근거를 나누고 좋은 제품의 성분을 모든 근거에서 뺀다")
    void analyzesCandidatesAcrossSkinCautions() {
        SuspectCandidates candidates = SkinCautions.of(SkinType.COMBINATION, true).candidatesWith(
            Map.of("FRAGRANCE_ALLERGENS", Set.of(LIMONENE), "DRYING_ALCOHOLS", Set.of(ALCOHOL))
        );

        SuspectIngredients suspects = new RatedProducts(
            List.of(product(1L, LIMONENE, ALCOHOL, 317L, 527L, WATER)),
            List.of(product(2L, LIMONENE))
        ).suspectIngredients(candidates);

        assertThat(suspects.ingredientIds()).containsExactly(ALCOHOL, 317L, 527L);
        assertThat(suspects.items().getFirst().reasons())
            .containsExactly(IngredientAnalysisReason.DRY_SKIN);
        assertThat(new RatedProducts(List.of(), List.of()).suspectIngredients(candidates).items()).isEmpty();
    }

    @Test
    @DisplayName("약한 근거 성분은 다른 근거의 성분이 하나도 남지 않을 때만 고른다")
    void choosesWeakEvidenceOnlyWithoutStrongSuspect() {
        SuspectCandidates candidates = SuspectCandidates.of(
            Set.of(LIMONENE),
            Set.of(PHENOXYETHANOL, ALCOHOL),
            Map.of(SkinCaution.DRY_SKIN, Set.of(ALCOHOL))
        );

        SuspectIngredients withStrong = new RatedProducts(
            List.of(product(1L, PHENOXYETHANOL, ALCOHOL, LIMONENE)),
            List.of()
        ).suspectIngredients(candidates);
        SuspectIngredients weakOnly = new RatedProducts(List.of(product(1L, WATER, PHENOXYETHANOL)), List.of())
            .suspectIngredients(candidates);
        SuspectIngredients offsetStrong = new RatedProducts(
            List.of(product(1L, PHENOXYETHANOL, LIMONENE)),
            List.of(product(2L, LIMONENE))
        ).suspectIngredients(candidates);

        assertThat(withStrong.ingredientIds()).containsExactly(ALCOHOL, LIMONENE);
        assertThat(weakOnly.ingredientIds()).containsExactly(PHENOXYETHANOL);
        assertThat(weakOnly.items().getFirst().reasons()).containsExactly(IngredientAnalysisReason.WEAK_EVIDENCE);
        assertThat(offsetStrong.ingredientIds()).containsExactly(PHENOXYETHANOL);
    }

    @Test
    @DisplayName("구성품이 여러 개면 성분을 합쳐 한 제품으로 센다")
    void countsMultiPartProductOnce() {
        Product kit = product(1L, List.of(new Long[] {LIMONENE}, new Long[] {LIMONENE, ALCOHOL}));

        SuspectIngredients suspects = new RatedProducts(List.of(kit, product(2L, LIMONENE)), List.of())
            .suspectIngredients(CANDIDATES);

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

        SuspectIngredients suspects = new RatedProducts(List.of(kit), List.of()).suspectIngredients(CANDIDATES);

        assertThat(suspects.ingredientIds()).containsExactly(LINALOOL, ALCOHOL, LIMONENE);
    }

    @Test
    @DisplayName("고른 성분이 하나라도 든 제품을 알아본다")
    void tellsProductContainingSuspect() {
        SuspectIngredients suspects = new RatedProducts(List.of(product(1L, LIMONENE)), List.of())
            .suspectIngredients(CANDIDATES);

        assertThat(suspects.isContainedIn(product(2L, WATER, LIMONENE))).isTrue();
        assertThat(suspects.isContainedIn(product(3L, WATER, ALCOHOL))).isFalse();
    }

    @Test
    @DisplayName("입력 제품 목록이 바뀌어도 평가 집합의 성분 분석은 유지한다")
    void preservesRatingsAfterInputListsChange() {
        List<Product> unsuitedProducts = new ArrayList<>(List.of(product(1L, LIMONENE, ALCOHOL)));
        List<Product> suitedProducts = new ArrayList<>(List.of(product(2L, ALCOHOL)));
        RatedProducts ratedProducts = new RatedProducts(unsuitedProducts, suitedProducts);

        unsuitedProducts.clear();
        suitedProducts.clear();

        assertThat(ratedProducts.suspectIngredients(CANDIDATES).ingredientIds()).containsExactly(LIMONENE);
    }

    private static Product product(Long id, Long... ingredientIds) {
        return product(id, List.<Long[]>of(ingredientIds));
    }

    private static Product product(Long id, Category category, Long... ingredientIds) {
        return product(id, category, List.<Long[]>of(ingredientIds));
    }

    private static Product product(Long id, List<Long[]> partIngredientIds) {
        return product(id, FACE_LEAVE_ON_CATEGORY, partIngredientIds);
    }

    private static Product product(Long id, Category category, List<Long[]> partIngredientIds) {
        List<ProductPart> parts = partIngredientIds.stream()
            .map(
                ids -> new ProductPart(
                    id,
                    null,
                    new Ingredients(Arrays.stream(ids).map(RatedProductsTest::ingredient).toList())
                )
            )
            .toList();
        return new Product(
            id,
            "제품 " + id,
            new Brand(1L, "브랜드", null, null),
            category,
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
        return Ingredient.create(id, "성분 " + id, null, null, null, null, null, null);
    }
}
