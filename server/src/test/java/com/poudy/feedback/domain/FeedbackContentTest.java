package com.poudy.feedback.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

@DisplayName("의견 내용")
class FeedbackContentTest {

    @Test
    @DisplayName("앞뒤 공백을 제거하고 중간 공백을 포함해 10자이면 접수한다")
    void acceptsTenCharactersIncludingSpaces() {
        assertThat(new FeedbackContent("  가 나 다 라 마바  ").value()).isEqualTo("가 나 다 라 마바");
    }

    @Test
    @DisplayName("앞뒤 공백을 제거한 내용이 2,000자이면 접수한다")
    void acceptsMaximumLengthAfterTrimming() {
        String content = "가".repeat(2000);

        assertThat(new FeedbackContent("  " + content + "  ").value()).isEqualTo(content);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "짧아요", "  가 나 다 라 마  "})
    @DisplayName("앞뒤 공백을 제거한 내용이 10자보다 짧으면 거절한다")
    void rejectsShortContent(String content) {
        assertThatThrownBy(() -> new FeedbackContent(content)).isInstanceOf(InvalidFeedbackException.class);
    }

    @Test
    @DisplayName("앞뒤 공백을 제거한 내용이 2,000자를 넘으면 거절한다")
    void rejectsTooLongContent() {
        assertThatThrownBy(() -> new FeedbackContent("  " + "가".repeat(2001) + "  "))
            .isInstanceOf(InvalidFeedbackException.class);
    }
}
