package com.poudy.product.domain.sensory;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("제품 감각 v0 성분 프로필")
class HeuristicIngredientSensoryProfilesTest {

    @Test
    @DisplayName("성분명 구분자를 해석하지 않고 안정 ID로만 축 신호를 찾는다")
    void findsAxisSignalsOnlyByStableIngredientId() {
        assertThat(HeuristicIngredientSensoryProfiles.findSignal(586L))
                .contains(new HeuristicIngredientSensoryProfiles.Signal(true, false));
        assertThat(HeuristicIngredientSensoryProfiles.findSignal(2896L))
                .contains(new HeuristicIngredientSensoryProfiles.Signal(false, true));
    }

    @Test
    @DisplayName("빈출 glycol은 공개 함량 없이는 축 신호와 confidence 근거로 쓰지 않는다")
    void defersFrequentGlycolsWithoutConcentrationEvidence() {
        assertThat(HeuristicIngredientSensoryProfiles.findSignal(4840L)).isEmpty();
        assertThat(HeuristicIngredientSensoryProfiles.findSignal(2898L)).isEmpty();
        assertThat(HeuristicIngredientSensoryProfiles.reviewDisposition(4840L))
                .contains(HeuristicIngredientSensoryProfiles.ReviewDisposition.DEFERRED_CONCENTRATION);
        assertThat(HeuristicIngredientSensoryProfiles.reviewDisposition(2898L))
                .contains(HeuristicIngredientSensoryProfiles.ReviewDisposition.DEFERRED_CONCENTRATION);
    }

    @Test
    @DisplayName("물과 active와 레올로지 성분은 근거 없이 유수분 신호로 만들지 않는다")
    void leavesUnsupportedFrequentIngredientsUnclassified() {
        assertThat(HeuristicIngredientSensoryProfiles.reviewDisposition(2681L)).isEmpty();
        assertThat(HeuristicIngredientSensoryProfiles.reviewDisposition(1938L)).isEmpty();
        assertThat(HeuristicIngredientSensoryProfiles.reviewDisposition(2859L)).isEmpty();
    }

    @Test
    @DisplayName("빈출 성분 프로필 목록은 독립 버전을 가진다")
    void declaresIndependentVersion() {
        assertThat(HeuristicIngredientSensoryProfiles.VERSION)
                .isEqualTo("ingredient-role-profile-v0.2");
    }
}
