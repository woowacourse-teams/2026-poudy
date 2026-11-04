package com.poudy.routine.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("루틴 메모")
class RoutineMemoTest {

    @Test
    @DisplayName("공백뿐인 메모는 없는 것으로 본다")
    void treatsBlankAsEmpty() {
        assertThat(new RoutineMemo("  ").value()).isNull();
    }

    @Test
    @DisplayName("200자까지 받고 넘으면 ROUTINE_MEMO_TOO_LONG 으로 거절한다")
    void rejectsTooLong() {
        assertThat(new RoutineMemo("가".repeat(200)).value()).hasSize(200);
        assertThatThrownBy(() -> new RoutineMemo("가".repeat(201)))
            .isInstanceOf(InvalidRoutineException.class)
            .extracting("code")
            .hasToString("ROUTINE_MEMO_TOO_LONG");
    }
}
