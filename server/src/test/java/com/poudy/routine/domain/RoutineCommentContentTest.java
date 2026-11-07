package com.poudy.routine.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("루틴 댓글 내용")
class RoutineCommentContentTest {

    @Test
    @DisplayName("앞뒤 공백을 지우고 300자까지 받는다")
    void stripsAndAcceptsUpToThreeHundred() {
        assertThat(new RoutineCommentContent("  좋아요  ").value()).isEqualTo("좋아요");
        assertThat(new RoutineCommentContent("가".repeat(300)).value()).hasSize(300);
    }

    @Test
    @DisplayName("비었거나 300자를 넘으면 거절한다")
    void rejectsBlankAndTooLong() {
        assertThatThrownBy(() -> new RoutineCommentContent("   "))
            .isInstanceOf(InvalidRoutineException.class)
            .extracting("code")
            .hasToString("INVALID_ROUTINE_COMMENT");
        assertThatThrownBy(() -> new RoutineCommentContent("가".repeat(301)))
            .isInstanceOf(InvalidRoutineException.class)
            .extracting("code")
            .hasToString("ROUTINE_COMMENT_TOO_LONG");
    }
}
