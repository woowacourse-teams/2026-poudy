package com.poudy.shelf.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("직전 성분 분석 결과")
class AnalysisSnapshotTest {

    @Test
    @DisplayName("직전 결과가 없으면 모든 성분이 새 성분이다")
    void marksAllAsNewWithoutPreviousResult() {
        AnalysisSnapshot next = AnalysisSnapshot.empty().next(List.of(1L, 2L));

        assertThat(next.newByIngredientId()).isEqualTo(Map.of(1L, true, 2L, true));
    }

    @Test
    @DisplayName("직전 결과에 없던 성분만 새 성분이고, 사라졌다가 다시 생긴 성분도 새 성분이다")
    void marksOnlyIngredientsMissingFromPreviousResult() {
        AnalysisSnapshot previous = new AnalysisSnapshot(Map.of(1L, true, 2L, false));

        AnalysisSnapshot withoutTwo = previous.next(List.of(1L));
        AnalysisSnapshot twoAgain = withoutTwo.next(List.of(1L, 2L, 3L));

        assertThat(withoutTwo.newByIngredientId()).isEqualTo(Map.of(1L, false));
        assertThat(twoAgain.newByIngredientId()).isEqualTo(Map.of(1L, false, 2L, true, 3L, true));
    }

    @Test
    @DisplayName("순서와 상관없이 같은 성분이면 결과가 같다고 본다")
    void comparesIngredientsRegardlessOfOrder() {
        AnalysisSnapshot snapshot = new AnalysisSnapshot(Map.of(1L, true, 2L, false));

        assertThat(snapshot.hasSameIngredients(List.of(2L, 1L))).isTrue();
        assertThat(snapshot.hasSameIngredients(List.of(1L))).isFalse();
        assertThat(snapshot.isNew(1L)).isTrue();
        assertThat(snapshot.isNew(3L)).isFalse();
    }
}
