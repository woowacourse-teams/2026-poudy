package com.poudy.routine.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.skintype.domain.SkinType;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("루틴 댓글")
class RoutineCommentTest {

    private static RoutineComment commentBy(long authorId, long routineAuthorId) {
        return new RoutineComment(
            1L,
            "좋아요",
            OffsetDateTime.parse("2026-11-04T12:00:00+09:00"),
            new RoutineCommentAuthor(authorId, "촉촉한판다", null, SkinType.COMBINATION),
            routineAuthorId
        );
    }

    @Test
    @DisplayName("보는 회원이 쓴 댓글인지 판단하고, 로그인하지 않았으면 내 댓글이 아니다")
    void knowsWhoWroteIt() {
        RoutineComment comment = commentBy(7L, 3L);

        assertThat(comment.isWrittenBy(7L)).isTrue();
        assertThat(comment.isWrittenBy(8L)).isFalse();
        assertThat(comment.isWrittenBy(null)).isFalse();
    }

    @Test
    @DisplayName("루틴 작성자가 쓴 댓글인지 판단해 화면 값에 담는다")
    void knowsRoutineAuthorComment() {
        assertThat(commentBy(3L, 3L).isByRoutineAuthor()).isTrue();
        assertThat(commentBy(7L, 3L).isByRoutineAuthor()).isFalse();
        assertThat(commentBy(3L, 3L).viewFor(3L, null)).extracting("byRoutineAuthor", "mine")
            .containsExactly(true, true);
    }
}
