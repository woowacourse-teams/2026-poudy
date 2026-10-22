package com.poudy.shelf.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.HashMap;
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

        assertThat(next.isNew(1L)).isTrue();
        assertThat(next.isNew(2L)).isTrue();
        assertThat(next.isNew(3L)).isFalse();
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
    @DisplayName("성분이 같으면 순서와 상관없이 이전 새 성분 표시를 모두 지운다")
    void clearsNewFlagsWhenIngredientsAreUnchanged() {
        AnalysisSnapshot snapshot = new AnalysisSnapshot(Map.of(1L, true, 2L, true));

        assertThat(snapshot.next(List.of(2L, 1L)).newByIngredientId()).isEqualTo(Map.of(1L, false, 2L, false));
    }

    @Test
    @DisplayName("모든 성분이 사라지면 빈 결과가 되고, 다음 결과는 모두 새 성분이다")
    void clearsPreviousIngredients() {
        AnalysisSnapshot cleared = new AnalysisSnapshot(Map.of(1L, true)).next(List.of());

        assertThat(cleared.newByIngredientId()).isEmpty();
        assertThat(cleared.next(List.of(1L)).isNew(1L)).isTrue();
    }

    @Test
    @DisplayName("입력 상태와 성분 목록이 나중에 바뀌어도 새 성분 판단은 유지한다")
    void ownsItsAnalysisState() {
        Map<Long, Boolean> storedFlags = new HashMap<>(Map.of(1L, true));
        AnalysisSnapshot previous = new AnalysisSnapshot(storedFlags);
        List<Long> ingredientIds = new ArrayList<>(List.of(1L, 2L));
        AnalysisSnapshot next = previous.next(ingredientIds);

        storedFlags.clear();
        ingredientIds.clear();

        assertThat(previous.isNew(1L)).isTrue();
        assertThat(next.isNew(1L)).isFalse();
        assertThat(next.isNew(2L)).isTrue();
    }
}
