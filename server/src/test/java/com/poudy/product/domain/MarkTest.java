package com.poudy.product.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class MarkTest {

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "\t", "\n", "\r", "\f", "\u000b"})
    void rejectsMissingOrBlankText(String text) {
        assertThatThrownBy(() -> new Mark(text, "다이소")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Mark("DAISO", text)).isInstanceOf(IllegalArgumentException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"A B", "A\tB", "A\nB", "A\rB", "A\fB", "A\u000bB"})
    void rejectsWhitespaceInCodes(String code) {
        assertThatThrownBy(() -> new Mark(code, "다이소")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void allowsSpacesWithinDisplayNames() {
        assertThat(new Mark("MINERAL", "무기 자차").name()).isEqualTo("무기 자차");
    }

    @Test
    void preservesTextWithoutNormalization() {
        Mark mark = new Mark("daiso", "다이소");
        assertThat(mark.code()).isEqualTo("daiso");
        assertThat(mark.name()).isEqualTo("다이소");
    }

    @ParameterizedTest
    @ValueSource(strings = {"A\u00a0B", "A\u3000B"})
    void leavesNonAsciiWhitespaceValidationToDatabase(String text) {
        assertThat(new Mark(text, text).code()).isEqualTo(text);
        assertThat(new Mark(text, text).name()).isEqualTo(text);
    }

    @Test
    void matchesDatabaseCharacterLengthIncludingSupplementaryCharacters() {
        assertThat(new Mark("가".repeat(50), "😀".repeat(100)).name()).hasSize(200);
        assertThatThrownBy(() -> new Mark("가".repeat(51), "다이소")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Mark("DAISO", "😀".repeat(101)))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
