package com.poudy.ingredient.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.poudy.tag.domain.FormulationRole;
import com.poudy.tag.domain.SkinEffect;
import com.poudy.tag.domain.TagCategory;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("성분")
class IngredientTest {

    private static Ingredient ingredient(String englishName, String originDefinition, List<IngredientTag> tags) {
        return new Ingredient(1L, "글리세린", englishName, originDefinition, "설명", "근거", null, tags, null, null);
    }

    private static Ingredient withEvidence(String descriptionEvidence) {
        return new Ingredient(1L, "글리세린", "Glycerin", "유래", "설명", descriptionEvidence, null, List.of(), null, null);
    }

    private static Ingredient withEvidenceAndTags(String descriptionEvidence, List<IngredientTag> tags) {
        return new Ingredient(1L, "글리세린", "Glycerin", "유래", "설명", descriptionEvidence, null, tags, null, null);
    }

    @Test
    @DisplayName("표준 자료에 없는 영문명과 유래는 빈 문자열로 채운다")
    void fillsMissingTextWithEmptyString() {
        Ingredient ingredient = ingredient(null, null, List.of());

        assertThat(ingredient.englishName()).isEmpty();
        assertThat(ingredient.originDefinition()).isEmpty();
    }

    @Test
    @DisplayName("값이 있으면 그대로 둔다")
    void keepsPresentText() {
        Ingredient ingredient = ingredient("Glycerin", "이 원료는 …", List.of());

        assertThat(ingredient.englishName()).isEqualTo("Glycerin");
        assertThat(ingredient.originDefinition()).isEqualTo("이 원료는 …");
    }

    @Test
    @DisplayName("배합 목적과 피부 작용을 태그 축으로 갈라 준다")
    void splitsTagsByCategory() {
        Ingredient ingredient = ingredient(
                "Glycerin",
                "유래",
                List.of(
                        new IngredientTag("HUMECTANT", TagCategory.FUNCTION, "출처"),
                        new IngredientTag("SKIN_CONDITIONING", TagCategory.FUNCTION, "출처"),
                        new IngredientTag("BARRIER_SUPPORT_RELATED", TagCategory.BIOLOGICAL_EFFECT, "출처"),
                        new IngredientTag("BOTANICAL_EXTRACT", TagCategory.INGREDIENT_CLASS, "출처")));

        assertThat(ingredient.tagsOf(TagCategory.FUNCTION)).extracting(IngredientTag::name)
                .containsExactly("HUMECTANT", "SKIN_CONDITIONING");
        assertThat(ingredient.tagsOf(TagCategory.BIOLOGICAL_EFFECT)).extracting(IngredientTag::name)
                .containsExactly("BARRIER_SUPPORT_RELATED");
    }

    @Test
    @DisplayName("배합 목적과 피부 작용을 ID 와 한글 이름이 있는 태그로 바꾼다")
    void resolvesTagsToNamedValues() {
        Ingredient ingredient = ingredient(
                "Glycerin",
                "유래",
                List.of(
                        new IngredientTag("HUMECTANT", TagCategory.FUNCTION, "출처"),
                        new IngredientTag("BARRIER_SUPPORT_RELATED", TagCategory.BIOLOGICAL_EFFECT, "출처")));

        assertThat(ingredient.formulationRoles()).extracting(FormulationRole::id, FormulationRole::displayName)
                .containsExactly(tuple(18L, "습윤제"));
        assertThat(ingredient.skinEffects()).extracting(SkinEffect::id, SkinEffect::displayName)
                .containsExactly(tuple(105L, "피부 장벽 관련"));
    }

    @Test
    @DisplayName("아직 enum 에 없는 태그 이름은 응답에서 빠진다")
    void skipsUnknownTagNames() {
        Ingredient ingredient = ingredient(
                "Glycerin",
                "유래",
                List.of(new IngredientTag("NOT_IN_ENUM", TagCategory.FUNCTION, "출처")));

        assertThat(ingredient.tagsOf(TagCategory.FUNCTION)).hasSize(1);
        assertThat(ingredient.formulationRoles()).isEmpty();
    }

    @Test
    @DisplayName("설명 근거 전체를 성분 정보 출처로 반환한다")
    void returnsDescriptionEvidenceAsInfoSources() {
        Ingredient ingredient = withEvidence(
                "대한화장품협회 성분사전 「가지열매추출물」(성분코드 2); Antioxidant Activity (Salerno et al., 2014); "
                        + "Enhanced Antioxidant Effects (Lee et al., 2025)");

        assertThat(ingredient.infoSources()).containsExactly(
                "대한화장품협회 성분사전 「가지열매추출물」(성분코드 2)",
                "Antioxidant Activity (Salerno et al., 2014)",
                "Enhanced Antioxidant Effects (Lee et al., 2025)");
        assertThat(ingredient.effectSources()).isEmpty();
    }

    @Test
    @DisplayName("노출되는 피부 작용 태그의 근거만 효과 출처로 반환한다")
    void returnsDisplayedBiologicalEffectEvidenceAsEffectSources() {
        Ingredient ingredient = withEvidenceAndTags(
                "설명 근거",
                List.of(
                        new IngredientTag("HUMECTANT", TagCategory.FUNCTION, "배합 목적 근거"),
                        new IngredientTag(
                                "BARRIER_SUPPORT_RELATED",
                                TagCategory.BIOLOGICAL_EFFECT,
                                "피부 장벽 연구 (Kim et al., 2024; Lee et al., 2025); 공통 근거"),
                        new IngredientTag("HYDRATION_RELATED", TagCategory.BIOLOGICAL_EFFECT, "공통 근거; 수분 공급 연구"),
                        new IngredientTag("NOT_IN_ENUM", TagCategory.BIOLOGICAL_EFFECT, "노출되지 않는 태그 근거")));

        assertThat(ingredient.effectSources())
                .containsExactly("피부 장벽 연구 (Kim et al., 2024; Lee et al., 2025)", "공통 근거", "수분 공급 연구");
    }

    @Test
    @DisplayName("출처 안의 괄호에 있는 세미콜론은 출처 경계로 보지 않는다")
    void preservesSemicolonInsideEvidence() {
        Ingredient ingredient = withEvidence(
                "대한화장품협회 성분사전 「몬모릴로나이트」(성분코드 290); "
                        + "Safety Assessment of Silicates (CIR Expert Panel, 2003; Burnett et al., 2025)");

        assertThat(ingredient.infoSources()).containsExactly(
                "대한화장품협회 성분사전 「몬모릴로나이트」(성분코드 290)",
                "Safety Assessment of Silicates (CIR Expert Panel, 2003; Burnett et al., 2025)");
    }

    @Test
    @DisplayName("근거가 없으면 두 출처 모두 비어 있다")
    void leavesBothSourcesEmptyWithoutEvidence() {
        Ingredient ingredient = withEvidence(null);

        assertThat(ingredient.infoSources()).isEmpty();
        assertThat(ingredient.effectSources()).isEmpty();
    }

    @Test
    @DisplayName("들고 있는 목록은 밖에서 고칠 수 없다")
    void keepsListsImmutable() {
        Ingredient ingredient = ingredient("Glycerin", "유래", List.of());

        assertThat(ingredient.aliases()).isEmpty();
        assertThat(ingredient.tagMappings()).isUnmodifiable();
    }
}
