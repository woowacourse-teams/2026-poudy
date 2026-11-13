package com.poudy.shelf.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("성분 분석 후보")
class SuspectCandidatesTest {

    @Test
    @DisplayName("생성에 사용한 성분과 피부 조건이 바뀌어도 후보와 선정 근거는 유지한다")
    void preservesCandidatesAfterInputsChange() {
        Set<Long> quickExcludeIngredients = new HashSet<>(Set.of(1L));
        Set<Long> drySkinIngredients = new HashSet<>(Set.of(1L, 2L));
        Map<SkinCaution, Set<Long>> cautionIngredients = new HashMap<>();
        cautionIngredients.put(SkinCaution.DRY_SKIN, drySkinIngredients);

        SuspectCandidates candidates = SuspectCandidates.of(quickExcludeIngredients, Set.of(), cautionIngredients);
        quickExcludeIngredients.clear();
        drySkinIngredients.add(3L);
        cautionIngredients.clear();

        assertThat(candidates.contains(1L)).isTrue();
        assertThat(candidates.reasonsOf(1L)).containsExactly(
            IngredientAnalysisReason.QUICK_EXCLUDE,
            IngredientAnalysisReason.DRY_SKIN
        );
        assertThat(candidates.reasonsOf(2L)).containsExactly(IngredientAnalysisReason.DRY_SKIN);
        assertThat(candidates.contains(3L)).isFalse();
    }
}
