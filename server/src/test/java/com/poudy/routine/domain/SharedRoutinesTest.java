package com.poudy.routine.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("공개 루틴 집합")
class SharedRoutinesTest {

    @Test
    @DisplayName("여러 루틴의 아침과 저녁에 겹치는 제품은 조회할 ID에 한 번만 담는다")
    void collectsDistinctProductIdsAcrossRoutines() {
        SharedRoutines routines = new SharedRoutines(
            List.of(
                routine(1L, List.of(2L, 1L), List.of(1L, 3L)),
                routine(2L, List.of(3L, 4L), List.of(2L, 5L))
            )
        );

        assertThat(routines.productIds()).containsExactly(2L, 1L, 3L, 4L, 5L);
    }

    @Test
    @DisplayName("루틴이 없으면 제품 조회 대상도 없다")
    void hasNoProductIdsWithoutRoutines() {
        SharedRoutines routines = new SharedRoutines(List.of());

        assertThat(routines.productIds()).isEmpty();
    }

    @Test
    @DisplayName("입력 목록이 바뀌어도 제품 조회 대상은 유지한다")
    void keepsProductIdsWhenInputChanges() {
        List<SharedRoutine> selectedRoutines = new ArrayList<>(
            List.of(routine(1L, List.of(1L), List.of(2L)))
        );
        SharedRoutines routines = new SharedRoutines(selectedRoutines);

        selectedRoutines.clear();
        selectedRoutines.add(routine(2L, List.of(3L), List.of()));

        assertThat(routines.productIds()).containsExactly(1L, 2L);
    }

    private SharedRoutine routine(long id, List<Long> morning, List<Long> evening) {
        return new SharedRoutine(
            new Routine(
                id,
                new RoutineName("공개 루틴"),
                new RoutineMemo(null),
                true,
                new RoutineProducts(morning, evening)
            ),
            new RoutineAuthor("작성자", null, null),
            new RoutineReactions(0, 0)
        );
    }
}
