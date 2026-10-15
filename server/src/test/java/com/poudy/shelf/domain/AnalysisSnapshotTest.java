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
        AnalysisSnapshot next = AnalysisSnapshot.empty().nextIfChanged(List.of(1L, 2L)).orElseThrow();

        assertThat(next.isNew(1L)).isTrue();
        assertThat(next.isNew(2L)).isTrue();
        assertThat(next.isNew(3L)).isFalse();
    }

    @Test
    @DisplayName("직전 결과에 없던 성분만 새 성분이고, 사라졌다가 다시 생긴 성분도 새 성분이다")
    void marksOnlyIngredientsMissingFromPreviousResult() {
        AnalysisSnapshot previous = new AnalysisSnapshot(Map.of(1L, true, 2L, false));

        AnalysisSnapshot withoutTwo = previous.nextIfChanged(List.of(1L)).orElseThrow();
        AnalysisSnapshot twoAgain = withoutTwo.nextIfChanged(List.of(1L, 2L, 3L)).orElseThrow();

        assertThat(withoutTwo.isNew(1L)).isFalse();
        assertThat(withoutTwo.isNew(2L)).isFalse();
        assertThat(twoAgain.isNew(1L)).isFalse();
        assertThat(twoAgain.isNew(2L)).isTrue();
        assertThat(twoAgain.isNew(3L)).isTrue();
    }

    @Test
    @DisplayName("성분이 같으면 순서와 상관없이 저장할 결과를 만들지 않고 새 성분 표시를 유지한다")
    void keepsNewFlagsWhenIngredientsAreUnchanged() {
        AnalysisSnapshot snapshot = new AnalysisSnapshot(Map.of(1L, true, 2L, false));

        assertThat(snapshot.nextIfChanged(List.of(2L, 1L))).isEmpty();
        assertThat(snapshot.isNew(1L)).isTrue();
        assertThat(snapshot.isNew(2L)).isFalse();
    }

    @Test
    @DisplayName("모든 성분이 사라지면 빈 결과로 갱신하고, 다시 비어 있으면 저장하지 않는다")
    void clearsPreviousIngredientsOnlyOnce() {
        AnalysisSnapshot previous = new AnalysisSnapshot(Map.of(1L, true));

        AnalysisSnapshot cleared = previous.nextIfChanged(List.of()).orElseThrow();

        assertThat(cleared.isNew(1L)).isFalse();
        assertThat(cleared.nextIfChanged(List.of())).isEmpty();
        assertThat(cleared.nextIfChanged(List.of(1L)).orElseThrow().isNew(1L)).isTrue();
    }

    @Test
    @DisplayName("처음부터 결과가 비어 있으면 저장하지 않는다")
    void skipsEmptyInitialResult() {
        assertThat(AnalysisSnapshot.empty().nextIfChanged(List.of())).isEmpty();
    }

    @Test
    @DisplayName("입력 상태와 성분 목록이 나중에 바뀌어도 새 성분 판단은 유지한다")
    void ownsItsAnalysisState() {
        Map<Long, Boolean> storedFlags = new HashMap<>(Map.of(1L, true));
        AnalysisSnapshot previous = new AnalysisSnapshot(storedFlags);
        List<Long> ingredientIds = new ArrayList<>(List.of(1L, 2L));
        AnalysisSnapshot next = previous.nextIfChanged(ingredientIds).orElseThrow();

        storedFlags.clear();
        ingredientIds.clear();

        assertThat(previous.isNew(1L)).isTrue();
        assertThat(previous.nextIfChanged(List.of(1L))).isEmpty();
        assertThat(next.isNew(1L)).isFalse();
        assertThat(next.isNew(2L)).isTrue();
        assertThat(next.nextIfChanged(List.of(1L, 2L))).isEmpty();
    }
}
