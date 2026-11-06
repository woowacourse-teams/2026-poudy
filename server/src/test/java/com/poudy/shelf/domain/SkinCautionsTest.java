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
        SuspectCandidates dry = SkinCautions.of(SkinType.DRY, false).candidatesWith(Set.of(), Map.of());
        assertThat(dry.reasonsOf(3663L)).containsExactly(IngredientAnalysisReason.DRY_SKIN);
        assertThat(dry.contains(317L)).isFalse();
        assertThat(dry.contains(527L)).isFalse();

        SuspectCandidates oily = SkinCautions.of(SkinType.OILY, false).candidatesWith(Set.of(), Map.of());
        assertThat(oily.reasonsOf(317L)).containsExactly(IngredientAnalysisReason.OILY_SKIN);
        assertThat(oily.contains(3663L)).isFalse();

        SuspectCandidates combination = SkinCautions.of(SkinType.COMBINATION, false).candidatesWith(Set.of(), Map.of());
        assertThat(combination.contains(3663L)).isTrue();
        assertThat(combination.contains(317L)).isTrue();
        assertThat(combination.contains(527L)).isFalse();
        assertThat(SkinCautions.of(null, null).candidatesWith(Set.of(), Map.of()).contains(3663L)).isFalse();
    }

    @Test
    @DisplayName("민감성은 피부 타입과 따로 더하고 여러 조건에 해당하는 근거를 모두 보존한다")
    void addsSensitiveSkinIndependently() {
        SuspectCandidates drySensitive = SkinCautions.of(SkinType.DRY, true).candidatesWith(Set.of(), Map.of());
        assertThat(drySensitive.reasonsOf(2365L))
            .containsExactly(IngredientAnalysisReason.DRY_SKIN, IngredientAnalysisReason.SENSITIVE_SKIN);
        assertThat(drySensitive.reasonsOf(527L)).containsExactly(IngredientAnalysisReason.SENSITIVE_SKIN);
        assertThat(drySensitive.contains(317L)).isFalse();

        SuspectCandidates sensitiveOnly = SkinCautions.of(null, true).candidatesWith(Set.of(), Map.of());
        assertThat(sensitiveOnly.reasonsOf(527L)).containsExactly(IngredientAnalysisReason.SENSITIVE_SKIN);
        assertThat(sensitiveOnly.contains(3663L)).isFalse();
    }

    @Test
    @DisplayName("각 성분군을 원래 피부 조건에 연결하고 빠른 제외와 피부 조건의 근거를 합친다")
    void preservesGroupReasons() {
        SkinCautions cautions = SkinCautions.of(SkinType.DRY, true);

        assertThat(cautions.ingredientGroupCodes())
            .containsExactly(
                "AHA",
                "DRYING_ALCOHOLS",
                "FRAGRANCE_ALLERGENS",
                "HARSH_PRESERVATIVES",
                "RETINOIDS",
                "SULFATES"
            );
        SuspectCandidates candidates = cautions.candidatesWith(
            Set.of(9L, 20L),
            Map.of("DRYING_ALCOHOLS", Set.of(9L), "FRAGRANCE_ALLERGENS", Set.of(20L))
        );
        assertThat(candidates.reasonsOf(9L)).containsExactly(
            IngredientAnalysisReason.QUICK_EXCLUDE,
            IngredientAnalysisReason.DRY_SKIN,
            IngredientAnalysisReason.SENSITIVE_SKIN
        );
        assertThat(candidates.reasonsOf(20L))
            .containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE, IngredientAnalysisReason.SENSITIVE_SKIN);
        assertThat(candidates.reasonsOf(3663L)).containsExactly(IngredientAnalysisReason.DRY_SKIN);
    }

    @Test
    @DisplayName("피부 정보를 모르면 모든 피부 조건 후보를 준비하되 각 조건을 구분한다")
    void preparesAllConditionalCandidates() {
        SuspectCandidates candidates = SkinCautions.all().candidatesWith(Set.of(100L), Map.of());

        assertThat(candidates.reasonsOf(100L)).containsExactly(IngredientAnalysisReason.QUICK_EXCLUDE);
        assertThat(candidates.reasonsOf(3663L)).containsExactly(IngredientAnalysisReason.DRY_SKIN);
        assertThat(candidates.reasonsOf(317L)).containsExactly(IngredientAnalysisReason.OILY_SKIN);
        assertThat(candidates.reasonsOf(527L)).containsExactly(IngredientAnalysisReason.SENSITIVE_SKIN);
    }
}
