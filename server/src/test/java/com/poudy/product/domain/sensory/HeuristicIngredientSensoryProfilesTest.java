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
    @DisplayName("프로필에 없는 성분은 축 신호로 사용하지 않는다")
    void ignoresIngredientsWithoutProfileEvidence() {
        assertThat(HeuristicIngredientSensoryProfiles.findSignal(4840L)).isEmpty();
        assertThat(HeuristicIngredientSensoryProfiles.findSignal(2898L)).isEmpty();
        assertThat(HeuristicIngredientSensoryProfiles.findSignal(null)).isEmpty();
    }

    @Test
    @DisplayName("빈출 성분 프로필 목록은 독립 버전을 가진다")
    void declaresIndependentVersion() {
        assertThat(HeuristicIngredientSensoryProfiles.VERSION)
            .isEqualTo("ingredient-role-profile-v0.2");
    }
}
