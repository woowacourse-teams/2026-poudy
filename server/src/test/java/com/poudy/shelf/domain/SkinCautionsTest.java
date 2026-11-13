package com.poudy.shelf.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.skintype.domain.SkinType;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("피부 주의 종류")
class SkinCautionsTest {

    @Test
    @DisplayName("피부 타입마다 주의 종류를 고르고 복합성은 건성과 지성 주의를 함께 고른다")
    void choosesCautionsBySkinType() {
        SuspectCandidates dry = SkinCautions.of(SkinType.DRY, false).candidatesWith(Map.of());
        assertThat(dry.reasonsOf(3663L)).containsExactly(IngredientAnalysisReason.DRY_SKIN);
        assertThat(dry.contains(317L)).isFalse();
        assertThat(dry.contains(527L)).isFalse();

        SuspectCandidates oily = SkinCautions.of(SkinType.OILY, false).candidatesWith(Map.of());
        assertThat(oily.reasonsOf(317L)).containsExactly(IngredientAnalysisReason.OILY_SKIN);
        assertThat(oily.contains(3663L)).isFalse();

        SuspectCandidates combination = SkinCautions.of(SkinType.COMBINATION, false).candidatesWith(Map.of());
        assertThat(combination.contains(3663L)).isTrue();
        assertThat(combination.contains(317L)).isTrue();
        assertThat(combination.contains(527L)).isFalse();
        assertThat(SkinCautions.of(null, null).candidatesWith(Map.of()).contains(3663L)).isFalse();
    }

    @Test
    @DisplayName("민감성은 피부 타입과 따로 더하고 여러 조건에 해당하는 근거를 모두 보존한다")
    void addsSensitiveSkinIndependently() {
        SuspectCandidates drySensitive = SkinCautions.of(SkinType.DRY, true).candidatesWith(Map.of());
        assertThat(drySensitive.reasonsOf(2365L))
            .containsExactly(IngredientAnalysisReason.DRY_SKIN, IngredientAnalysisReason.SENSITIVE_SKIN);
        assertThat(drySensitive.reasonsOf(527L)).containsExactly(IngredientAnalysisReason.SENSITIVE_SKIN);
        assertThat(drySensitive.contains(317L)).isFalse();

        SuspectCandidates sensitiveOnly = SkinCautions.of(null, true).candidatesWith(Map.of());
        assertThat(sensitiveOnly.reasonsOf(527L)).containsExactly(IngredientAnalysisReason.SENSITIVE_SKIN);
        assertThat(sensitiveOnly.contains(3663L)).isFalse();
    }

    @Test
    @DisplayName("각 성분군을 원래 피부 조건에 연결하고 공통 후보와 피부 조건의 근거를 합친다")
    void preservesGroupReasons() {
        SkinCautions cautions = SkinCautions.of(SkinType.DRY, true);

        assertThat(cautions.ingredientGroupCodes())
            .containsExactly("AHA", "DRYING_ALCOHOLS", "FRAGRANCE_ALLERGENS", "RETINOIDS", "SULFATES");
        SuspectCandidates candidates = cautions.candidatesWith(
            Map.of("DRYING_ALCOHOLS", Set.of(9L), "FRAGRANCE_ALLERGENS", Set.of(20L), "SULFATES", Set.of(30L))
        );
        assertThat(candidates.reasonsOf(9L)).containsExactly(IngredientAnalysisReason.DRY_SKIN);
        assertThat(candidates.reasonsOf(20L))
            .containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE, IngredientAnalysisReason.SENSITIVE_SKIN);
        assertThat(candidates.reasonsOf(30L))
            .containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE, IngredientAnalysisReason.DRY_SKIN);
        assertThat(candidates.reasonsOf(3663L)).containsExactly(IngredientAnalysisReason.DRY_SKIN);
    }

    @Test
    @DisplayName("공통 후보는 피부 정보와 관계없이 향료·설페이트 성분군과 알레르기 방부제만 쓴다")
    void usesCommonCandidatesRegardlessOfSkin() {
        SuspectCandidates candidates = SkinCautions.of(null, null)
            .candidatesWith(Map.of("FRAGRANCE_ALLERGENS", Set.of(20L), "HARSH_PRESERVATIVES", Set.of(3551L)));

        assertThat(SkinCautions.of(null, null).ingredientGroupCodes())
            .containsExactly("FRAGRANCE_ALLERGENS", "SULFATES");
        assertThat(candidates.reasonsOf(20L)).containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE);
        assertThat(candidates.reasonsOf(206L)).containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE);
        assertThat(candidates.reasonsOf(5147L)).containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE);
        assertThat(candidates.contains(3551L)).isFalse();
    }

    @Test
    @DisplayName("공통 후보는 향료 알레르기 유발 성분과 페루발삼·프로폴리스·라놀린을 피부 정보와 관계없이 쓴다")
    void usesContactAllergensAsCommonCandidates() {
        SuspectCandidates common = SkinCautions.of(null, null).candidatesWith(Map.of());

        assertThat(common.reasonsOf(2504L)).containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE);
        assertThat(common.reasonsOf(11754L)).containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE);
        assertThat(common.reasonsOf(3956L)).containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE);
        assertThat(common.reasonsOf(5258L)).containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE);
        assertThat(common.reasonsOf(229L)).containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE);
        assertThat(common.contains(527L)).isFalse();
        assertThat(common.contains(522L)).isFalse();
    }

    @Test
    @DisplayName("향료 알레르기 유발 성분은 민감성 근거를 함께 갖고 벤질알코올·벤질벤조에이트는 민감성에만 쓴다")
    void keepsSensitiveReasonOnFragranceAllergens() {
        SuspectCandidates sensitive = SkinCautions.of(null, true).candidatesWith(Map.of());

        assertThat(sensitive.reasonsOf(2504L))
            .containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE, IngredientAnalysisReason.SENSITIVE_SKIN);
        assertThat(sensitive.reasonsOf(527L)).containsExactly(IngredientAnalysisReason.SENSITIVE_SKIN);
        assertThat(sensitive.reasonsOf(522L)).containsExactly(IngredientAnalysisReason.SENSITIVE_SKIN);
    }

    @Test
    @DisplayName("라놀린은 지성 피부에서 밀폐 성분 근거를 함께 갖는다")
    void keepsOcclusiveReasonOnLanolin() {
        SuspectCandidates oily = SkinCautions.of(SkinType.OILY, false).candidatesWith(Map.of());

        assertThat(oily.reasonsOf(5257L))
            .containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE, IngredientAnalysisReason.OILY_SKIN);
    }

    @Test
    @DisplayName("민감성은 벤조페논-3·고추 원료·프로필렌글라이콜을 더하고 파프리카추출물은 쓰지 않는다")
    void addsPhotoallergensCapsicumAndGlycolsToSensitive() {
        SuspectCandidates sensitive = SkinCautions.of(null, true).candidatesWith(Map.of());
        SuspectCandidates common = SkinCautions.of(null, null).candidatesWith(Map.of());

        assertThat(sensitive.reasonsOf(511L)).containsExactly(IngredientAnalysisReason.SENSITIVE_SKIN);
        assertThat(sensitive.reasonsOf(9685L)).containsExactly(IngredientAnalysisReason.SENSITIVE_SKIN);
        assertThat(sensitive.reasonsOf(5264L)).containsExactly(IngredientAnalysisReason.SENSITIVE_SKIN);
        assertThat(sensitive.reasonsOf(3959L)).containsExactly(IngredientAnalysisReason.SENSITIVE_SKIN);
        assertThat(sensitive.contains(6296L)).isFalse();
        assertThat(common.contains(511L)).isFalse();
        assertThat(common.contains(3959L)).isFalse();
    }

    @Test
    @DisplayName("민감성은 살리실릭애씨드·소르빅애씨드를 더하고 아스코빅애씨드·클로페네신을 쓰지 않는다")
    void adjustsSensitiveCandidates() {
        SuspectCandidates sensitive = SkinCautions.of(null, true).candidatesWith(Map.of());

        assertThat(sensitive.reasonsOf(811L)).containsExactly(IngredientAnalysisReason.SENSITIVE_SKIN);
        assertThat(sensitive.reasonsOf(1298L)).containsExactly(IngredientAnalysisReason.SENSITIVE_SKIN);
        assertThat(sensitive.contains(1718L)).isFalse();
        assertThat(sensitive.contains(3178L)).isFalse();
    }

    @Test
    @DisplayName("지성은 시어버터·비즈왁스를 밀폐 성분으로 보지 않는다")
    void excludesSheaButterAndBeeswaxFromOily() {
        SuspectCandidates oily = SkinCautions.of(SkinType.OILY, false).candidatesWith(Map.of());

        assertThat(oily.contains(1354L)).isFalse();
        assertThat(oily.contains(721L)).isFalse();
        assertThat(oily.contains(7368L)).isFalse();
        assertThat(oily.reasonsOf(2872L)).containsExactly(IngredientAnalysisReason.OILY_SKIN);
    }
}
