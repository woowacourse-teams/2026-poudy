package com.poudy.product.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class BadgeTest {

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "A B", "A\tB", "A\nB", "A\rB", "A\fB", "A\u000bB"})
    void rejectsMissingOrWhitespaceText(String text) {
        assertThatThrownBy(() -> new Badge(text, "다이소")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Badge("DAISO", text)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void preservesTextWithoutNormalization() {
        Badge badge = new Badge("daiso", "다이소");
        assertThat(badge.code()).isEqualTo("daiso");
        assertThat(badge.name()).isEqualTo("다이소");
    }

    @ParameterizedTest
    @ValueSource(strings = {"A\u00a0B", "A\u3000B"})
    void leavesNonAsciiWhitespaceValidationToDatabase(String text) {
        assertThat(new Badge(text, text).code()).isEqualTo(text);
        assertThat(new Badge(text, text).name()).isEqualTo(text);
    }

    @Test
    void matchesDatabaseCharacterLengthIncludingSupplementaryCharacters() {
        assertThat(new Badge("가".repeat(50), "😀".repeat(100)).name()).hasSize(200);
        assertThatThrownBy(() -> new Badge("가".repeat(51), "다이소")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Badge("DAISO", "😀".repeat(101))).isInstanceOf(IllegalArgumentException.class);
    }
}
