package com.poudy.shelf.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.stream.Stream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

@DisplayName("평가 당시 프로필")
class RaterProfileTest {

    private static final RaterProfile OILY_TWENTIES = new RaterProfile("FEMALE", "TWENTIES", "OILY", false);

    @Test
    @DisplayName("서로 다른 객체도 네 항목의 값이 같으면 같은 프로필이다")
    void matchesSameValues() {
        assertThat(OILY_TWENTIES.hasSameValuesAs(new RaterProfile("FEMALE", "TWENTIES", "OILY", false))).isTrue();
    }

    @Test
    @DisplayName("선택하지 않은 항목은 서로 같은 값으로 본다")
    void matchesUnsetValues() {
        RaterProfile unset = new RaterProfile(null, null, null, null);

        assertThat(unset.hasSameValuesAs(new RaterProfile(null, null, null, null))).isTrue();
    }

    @ParameterizedTest
    @MethodSource("differentProfiles")
    @DisplayName("한 항목이라도 다르면 다른 프로필이며 민감성 미선택과 false도 구분한다")
    void distinguishesChangedValues(RaterProfile other) {
        assertThat(OILY_TWENTIES.hasSameValuesAs(other)).isFalse();
    }

    private static Stream<RaterProfile> differentProfiles() {
        return Stream.of(
            new RaterProfile("MALE", "TWENTIES", "OILY", false),
            new RaterProfile("FEMALE", "THIRTIES", "OILY", false),
            new RaterProfile("FEMALE", "TWENTIES", "DRY", false),
            new RaterProfile("FEMALE", "TWENTIES", "OILY", true),
            new RaterProfile("FEMALE", "TWENTIES", "OILY", null)
        );
    }

    @Test
    @DisplayName("현재 enum에 없는 과거 코드도 그대로 비교한다")
    void comparesHistoricalCodes() {
        RaterProfile historical = new RaterProfile(null, "TWENTIES", "SENSITIVE", null);

        assertThat(historical.hasSameValuesAs(new RaterProfile(null, "TWENTIES", "SENSITIVE", null))).isTrue();
        assertThat(historical.hasSameValuesAs(new RaterProfile(null, "TWENTIES", "OILY", null))).isFalse();
    }
}
