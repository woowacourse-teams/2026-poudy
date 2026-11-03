package com.poudy.routine.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

@DisplayName("루틴 이름")
class RoutineNameTest {

    @Test
    @DisplayName("앞뒤 공백을 지우고 25자까지 받는다")
    void stripsAndAcceptsUpToTwentyFive() {
        assertThat(new RoutineName("  저녁 진정 루틴 ").value()).isEqualTo("저녁 진정 루틴");
        assertThat(new RoutineName("가".repeat(25)).value()).hasSize(25);
    }

    @Test
    @DisplayName("이모지도 한 글자로 센다")
    void countsCodePoints() {
        assertThat(new RoutineName("🌙".repeat(25)).value()).isEqualTo("🌙".repeat(25));
    }

    @Test
    @DisplayName("25자를 넘으면 ROUTINE_NAME_TOO_LONG 으로 거절한다")
    void rejectsTooLong() {
        assertThatThrownBy(() -> new RoutineName("가".repeat(26)))
            .isInstanceOf(InvalidRoutineException.class)
            .extracting("code")
            .hasToString("ROUTINE_NAME_TOO_LONG");
    }

    @ParameterizedTest(name = "[{0}]")
    @NullSource
    @ValueSource(strings = {"", "   "})
    @DisplayName("비었거나 공백뿐이면 INVALID_ROUTINE_NAME 으로 거절한다")
    void rejectsBlank(String value) {
        assertThatThrownBy(() -> new RoutineName(value))
            .isInstanceOf(InvalidRoutineException.class)
            .extracting("code")
            .hasToString("INVALID_ROUTINE_NAME");
    }
}
