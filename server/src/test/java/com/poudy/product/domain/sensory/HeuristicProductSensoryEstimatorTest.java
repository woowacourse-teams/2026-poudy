package com.poudy.product.domain.sensory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.category.domain.Category;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.IngredientTag;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.tag.domain.Tag;
import com.poudy.tag.domain.TagCategory;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("제품 감각 v0 휴리스틱 추론")
class HeuristicProductSensoryEstimatorTest {

    private final HeuristicProductSensoryEstimator estimator = new HeuristicProductSensoryEstimator();

    @Test
    @DisplayName("같은 category와 전성분 순서는 항상 같은 결과와 모델 버전을 만든다")
    void estimatesDeterministicallyWithVersionedParameters() {
        Category toner = category(2L, "스킨/토너");
        Ingredients ingredients = ingredients(
                ingredient(100L, "HUMECTANT"),
                ingredient(101L, "EMOLLIENT"));

        ProductSensory first = estimator.estimate(toner, ingredients);
        ProductSensory second = estimator.estimate(toner, ingredients);

        assertThat(first).isEqualTo(second);
        assertThat(estimator.modelVersion()).isEqualTo(first.modelVersion());
        assertThat(first.modelVersion())
                .isEqualTo(
                        new SensoryModelVersion(
                                "ingredient-role-profile-v0.2",
                                "category-sensory-prior-v0.1",
                                "ordinal-level-model-v0.1"));
    }

    @Test
    @DisplayName("수분 역할과 유연제 역할은 서로 다른 축만 올린다")
    void keepsMoistureAndOilSignalsIndependent() {
        Category cream = category(4L, "크림");
        ProductSensory baseline = estimator.estimate(cream, ingredients());
        ProductSensory moistureRich = estimator.estimate(
                cream,
                repeatedRoleIngredients(100L, 10, "HUMECTANT"));
        ProductSensory oilRich = estimator.estimate(
                cream,
                repeatedRoleIngredients(200L, 10, "EMOLLIENT"));

        assertThat(baseline.moisture().value()).isEqualTo(2);
        assertThat(baseline.oil().value()).isEqualTo(2);
        assertThat(moistureRich.moisture().value()).isEqualTo(3);
        assertThat(moistureRich.oil()).isEqualTo(baseline.oil());
        assertThat(oilRich.oil().value()).isEqualTo(3);
        assertThat(oilRich.moisture()).isEqualTo(baseline.moisture());
    }

    @Test
    @DisplayName("같은 역할도 전성분 앞쪽에 있을 때만 더 큰 보정 근거가 된다")
    void weightsEarlierIngredientPositionsMoreHeavily() {
        Category unknownCategory = category(999L, "미등록 제형");
        Ingredients early = repeatedRoleIngredients(100L, 5, "HUMECTANT");
        List<Ingredient> lateValues = new ArrayList<>();
        for (long id = 1; id <= 20; id++) {
            lateValues.add(ingredient(id));
        }
        for (long id = 100; id < 105; id++) {
            lateValues.add(ingredient(id, "HUMECTANT"));
        }

        ProductSensory earlyResult = estimator.estimate(unknownCategory, early);
        ProductSensory lateResult = estimator.estimate(unknownCategory, new Ingredients(lateValues));

        assertThat(earlyResult.moisture().value()).isEqualTo(2);
        assertThat(lateResult.moisture().value()).isEqualTo(1);
    }

    @Test
    @DisplayName("빈 기존 tag의 상위 빈출 보완 성분은 명시적인 v0 신호로만 사용한다")
    void appliesSmallCuratedOverridesForFrequentMissingTags() {
        Category unknownCategory = category(999L, "미등록 제형");
        Ingredients moistureOverrides = ingredients(
                ingredient(475L),
                ingredient(586L),
                ingredient(3500L),
                ingredient(3605L),
                ingredient(3953L));
        Ingredients oilOverrides = ingredients(
                ingredient(1463L),
                ingredient(2896L),
                ingredient(3260L),
                ingredient(4510L),
                ingredient(7587L));

        ProductSensory moisture = estimator.estimate(unknownCategory, moistureOverrides);
        ProductSensory oil = estimator.estimate(unknownCategory, oilOverrides);

        assertThat(moisture.moisture().value()).isEqualTo(2);
        assertThat(moisture.oil().value()).isEqualTo(1);
        assertThat(oil.moisture().value()).isEqualTo(1);
        assertThat(oil.oil().value()).isEqualTo(2);
    }

    @Test
    @DisplayName("미분류 성분은 0점 효과가 아니라 낮은 confidence로 남는다")
    void lowersConfidenceForUnclassifiedIngredients() {
        Category serum = category(3L, "에센스/세럼/앰플");
        Ingredients unclassified = repeatedRoleIngredients(100L, 10, null);
        Ingredients classified = repeatedRoleIngredients(200L, 10, "HUMECTANT");

        ProductSensory unclassifiedResult = estimator.estimate(serum, unclassified);
        ProductSensory classifiedResult = estimator.estimate(serum, classified);

        assertThat(unclassifiedResult.confidence().value())
                .isLessThan(classifiedResult.confidence().value());
        assertThat(classifiedResult.confidence().value())
                .isLessThanOrEqualTo(new BigDecimal("0.55"));
    }

    @Test
    @DisplayName("초기 범위 밖 category는 결과를 만들되 confidence가 더 낮다")
    void usesLowConfidenceFallbackForUnknownCategory() {
        Ingredients ingredients = repeatedRoleIngredients(100L, 10, "HUMECTANT");

        ProductSensory known = estimator.estimate(category(3L, "에센스/세럼/앰플"), ingredients);
        ProductSensory fallback = estimator.estimate(category(999L, "미등록 제형"), ingredients);

        assertThat(fallback.confidence().value()).isLessThan(known.confidence().value());
        assertThat(fallback.moisture().value()).isBetween(0, 3);
        assertThat(fallback.oil().value()).isBetween(0, 3);
    }

    @Test
    @DisplayName("중복 성분 참조는 점수를 두 번 올리지 않고 confidence만 낮춘다")
    void doesNotDoubleCountDuplicateIngredientReferences() {
        Category cream = category(4L, "크림");
        Ingredient humectant = ingredient(100L, "HUMECTANT");
        ProductSensory single = estimator.estimate(cream, ingredients(humectant));
        ProductSensory duplicate = estimator.estimate(cream, ingredients(humectant, humectant));

        assertThat(duplicate.moisture()).isEqualTo(single.moisture());
        assertThat(duplicate.oil()).isEqualTo(single.oil());
        assertThat(duplicate.confidence().value()).isLessThan(single.confidence().value());
    }

    @Test
    @DisplayName("category와 전성분 목록이 없으면 추론하지 않는다")
    void rejectsMissingRequiredInputs() {
        assertThatThrownBy(() -> estimator.estimate(null, ingredients()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> estimator.estimate(category(2L, "스킨/토너"), null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static Ingredients repeatedRoleIngredients(
            long firstId,
            int count,
            String role) {
        List<Ingredient> values = new ArrayList<>();
        for (int index = 0; index < count; index++) {
            values.add(
                    role == null
                            ? ingredient(firstId + index)
                            : ingredient(firstId + index, role));
        }
        return new Ingredients(values);
    }

    private static Ingredients ingredients(Ingredient... values) {
        return new Ingredients(List.of(values));
    }

    private static Ingredient ingredient(Long id, String... roles) {
        List<IngredientTag> tags = java.util.Arrays.stream(roles)
                .map(
                        role -> new IngredientTag(
                                new Tag(1L, TagCategory.FUNCTION, role, role),
                                "v0 estimator test evidence"))
                .toList();
        return new Ingredient(
                id,
                "성분 " + id,
                "Ingredient " + id,
                "",
                "",
                "",
                List.of(),
                tags,
                null,
                null);
    }

    private static Category category(Long id, String name) {
        return new Category(id, 1L, name, 1);
    }
}
