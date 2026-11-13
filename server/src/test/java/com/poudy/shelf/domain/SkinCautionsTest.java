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

        SuspectCandidates oily = SkinCautions.of(SkinType.OILY, false).candidatesWith(Map.of());
        assertThat(oily.reasonsOf(317L)).containsExactly(IngredientAnalysisReason.OILY_SKIN);
        assertThat(oily.contains(3663L)).isFalse();

        SuspectCandidates combination = SkinCautions.of(SkinType.COMBINATION, false).candidatesWith(Map.of());
        assertThat(combination.contains(3663L)).isTrue();
        assertThat(combination.contains(317L)).isTrue();
        assertThat(SkinCautions.of(null, null).candidatesWith(Map.of()).contains(3663L)).isFalse();
    }

    @Test
    @DisplayName("민감성은 피부 타입과 따로 더하고 여러 조건에 해당하는 근거를 모두 보존한다")
    void addsSensitiveSkinIndependently() {
        SuspectCandidates drySensitive = SkinCautions.of(SkinType.DRY, true).candidatesWith(Map.of());
        assertThat(drySensitive.reasonsOf(2365L))
            .containsExactly(
                IngredientAnalysisReason.QUICK_EXCLUDE,
                IngredientAnalysisReason.DRY_SKIN,
                IngredientAnalysisReason.SENSITIVE_SKIN
            );
        assertThat(drySensitive.reasonsOf(527L))
            .containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE, IngredientAnalysisReason.SENSITIVE_SKIN);
        assertThat(drySensitive.contains(317L)).isFalse();

        SuspectCandidates sensitiveOnly = SkinCautions.of(null, true).candidatesWith(Map.of());
        assertThat(sensitiveOnly.reasonsOf(527L))
            .containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE, IngredientAnalysisReason.SENSITIVE_SKIN);
        assertThat(sensitiveOnly.contains(3663L)).isFalse();
    }

    @Test
    @DisplayName("각 성분군을 원래 피부 조건에 연결하고 공통 후보와 피부 조건의 근거를 합친다")
    void preservesGroupReasons() {
        SkinCautions cautions = SkinCautions.of(SkinType.DRY, true);

        assertThat(cautions.ingredientGroupCodes())
            .containsExactly(
                "AHA",
                "DRYING_ALCOHOLS",
                "FRAGRANCE_ALLERGENS",
                "HARSH_PRESERVATIVES",
                "RETINOIDS",
                "SULFATES",
                "SYNTHETIC_COLORANTS"
            );
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
    @DisplayName("공통 후보는 피부 정보와 관계없이 향료·설페이트·자극성 방부제·합성 색소·민감성 성분군을 쓴다")
    void usesCommonCandidatesRegardlessOfSkin() {
        SuspectCandidates candidates = SkinCautions.of(null, null)
            .candidatesWith(Map.of("FRAGRANCE_ALLERGENS", Set.of(20L), "HARSH_PRESERVATIVES", Set.of(3551L)));

        assertThat(SkinCautions.of(null, null).ingredientGroupCodes())
            .containsExactly(
                "AHA",
                "FRAGRANCE_ALLERGENS",
                "HARSH_PRESERVATIVES",
                "RETINOIDS",
                "SULFATES",
                "SYNTHETIC_COLORANTS"
            );
        assertThat(candidates.reasonsOf(20L)).containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE);
        assertThat(candidates.reasonsOf(206L)).containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE);
        assertThat(candidates.reasonsOf(5147L)).containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE);
        assertThat(candidates.reasonsOf(3551L)).containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE);
    }

    @Test
    @DisplayName("공통 후보는 향료 알레르기 유발 성분·페루발삼·프로폴리스·라놀린·아황산염·밀 단백질과 민감성 후보를 피부 정보와 관계없이 쓴다")
    void usesContactAllergensAsCommonCandidates() {
        SuspectCandidates common = SkinCautions.of(null, null).candidatesWith(Map.of());

        assertThat(common.reasonsOf(2504L)).containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE);
        assertThat(common.reasonsOf(11754L)).containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE);
        assertThat(common.reasonsOf(3956L)).containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE);
        assertThat(common.reasonsOf(5258L)).containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE);
        assertThat(common.reasonsOf(229L)).containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE);
        assertThat(common.reasonsOf(527L)).containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE);
        assertThat(common.reasonsOf(522L)).containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE);
        assertThat(common.reasonsOf(1126L)).containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE);
        assertThat(common.reasonsOf(18738L)).containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE);
        assertThat(common.reasonsOf(4707L)).containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE);
    }

    @Test
    @DisplayName("민감성 회원은 공통 후보 중 민감성 후보에 민감성 근거를 함께 받는다")
    void keepsSensitiveReasonOnFragranceAllergens() {
        SuspectCandidates sensitive = SkinCautions.of(null, true).candidatesWith(Map.of());

        assertThat(sensitive.reasonsOf(2504L))
            .containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE, IngredientAnalysisReason.SENSITIVE_SKIN);
        assertThat(sensitive.reasonsOf(527L))
            .containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE, IngredientAnalysisReason.SENSITIVE_SKIN);
        assertThat(sensitive.reasonsOf(522L))
            .containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE, IngredientAnalysisReason.SENSITIVE_SKIN);
        assertThat(sensitive.reasonsOf(1126L)).containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE);
    }

    @Test
    @DisplayName("라놀린은 지성 피부에서 밀폐 성분 근거를 함께 갖는다")
    void keepsOcclusiveReasonOnLanolin() {
        SuspectCandidates oily = SkinCautions.of(SkinType.OILY, false).candidatesWith(Map.of());

        assertThat(oily.reasonsOf(5257L))
            .containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE, IngredientAnalysisReason.OILY_SKIN);
    }

    @Test
    @DisplayName("벤조페논-3·고추 원료·프로필렌글라이콜은 모든 회원의 후보이고 파프리카추출물은 쓰지 않는다")
    void addsPhotoallergensCapsicumAndGlycolsToSensitive() {
        SuspectCandidates sensitive = SkinCautions.of(null, true).candidatesWith(Map.of());
        SuspectCandidates common = SkinCautions.of(null, null).candidatesWith(Map.of());

        assertThat(sensitive.reasonsOf(511L))
            .containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE, IngredientAnalysisReason.SENSITIVE_SKIN);
        assertThat(sensitive.reasonsOf(9685L))
            .containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE, IngredientAnalysisReason.SENSITIVE_SKIN);
        assertThat(sensitive.reasonsOf(5264L))
            .containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE, IngredientAnalysisReason.SENSITIVE_SKIN);
        assertThat(sensitive.reasonsOf(3959L))
            .containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE, IngredientAnalysisReason.SENSITIVE_SKIN);
        assertThat(sensitive.contains(6296L)).isFalse();
        assertThat(common.reasonsOf(511L)).containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE);
        assertThat(common.reasonsOf(3959L)).containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE);
    }

    @Test
    @DisplayName("민감성은 살리실릭애씨드·소르빅애씨드를 더하고 아스코빅애씨드·클로페네신을 쓰지 않는다")
    void adjustsSensitiveCandidates() {
        SuspectCandidates sensitive = SkinCautions.of(null, true).candidatesWith(Map.of());

        assertThat(sensitive.reasonsOf(811L))
            .containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE, IngredientAnalysisReason.SENSITIVE_SKIN);
        assertThat(sensitive.reasonsOf(1298L))
            .containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE, IngredientAnalysisReason.SENSITIVE_SKIN);
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

    @Test
    @DisplayName("나이아신아마이드·에틸헥실글리세린·지방알코올·자극성 방부제·합성 색소는 공통 후보다")
    void usesIrritationReportedCandidates() {
        SuspectCandidates candidates = SkinCautions.of(SkinType.DRY, true)
            .candidatesWith(Map.of("HARSH_PRESERVATIVES", Set.of(3551L), "SYNTHETIC_COLORANTS", Set.of(40L)));

        assertThat(candidates.reasonsOf(1938L)).containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE);
        assertThat(candidates.reasonsOf(2070L)).containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE);
        assertThat(candidates.reasonsOf(995L)).containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE);
        assertThat(candidates.reasonsOf(3551L)).containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE);
        assertThat(candidates.reasonsOf(40L))
            .containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE, IngredientAnalysisReason.DRY_SKIN);
    }
}
