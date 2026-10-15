package com.poudy.shelf.domain;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

@DisplayName("선반 평가")
class RatingTest {

    @ParameterizedTest(name = "{0}")
    @ValueSource(doubles = {0, 0.5, 1, 1.5, 2, 2.5, 3})
    @DisplayName("수분감·유분감은 0부터 3까지 0.5 단위를 받는다")
    void acceptsHalfStepLevels(double level) {
        assertThatCode(() -> new Rating(RatingPreference.GOOD, level, level)).doesNotThrowAnyException();
    }

    @ParameterizedTest(name = "{0}")
    @ValueSource(doubles = {-0.5, 0.3, 3.5})
    @DisplayName("범위 밖이거나 0.5 단위가 아닌 수분감·유분감은 거절한다")
    void rejectsInvalidLevels(double level) {
        assertThatThrownBy(() -> new Rating(RatingPreference.GOOD, level, null))
            .isInstanceOf(InvalidRatingException.class);
        assertThatThrownBy(() -> new Rating(RatingPreference.GOOD, null, level))
            .isInstanceOf(InvalidRatingException.class);
    }
}
